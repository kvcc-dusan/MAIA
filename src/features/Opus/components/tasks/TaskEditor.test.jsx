// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskEditor from "./TaskEditor";

const project = { id: "p", workstreams: [{ id: "w1", name: "Design" }], milestones: [] };
const task = { id: "t1", title: "Ship it", desc: "", status: "todo", priority: "p3", owner: "Ana", due: null, estimate: null };

// waitFor polling never sees the async submit settle under motion in jsdom; a plain tick does.
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

const setup = (props = {}) => {
  const handlers = { onClose: vi.fn(), onSave: vi.fn(), onDelete: vi.fn() };
  render(<TaskEditor open mode="create" session={1} initial={{}} project={project} people={["Ana", "Bo"]} {...handlers} {...props} />);
  return handlers;
};

describe("TaskEditor", () => {
  afterEach(cleanup);

  it("shows the unified fields and no schedule or next-action controls", () => {
    setup();
    for (const label of ["Title", "Description", "Status", "Priority", "Workstream", "Milestone", "Owner", "Due date", "Estimate"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Schedule")).toBeNull();
    expect(screen.queryByText(/next action/i)).toBeNull();
  });

  it("blocks an empty title", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(await screen.findByText("Add a title to save this task.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a new task and closes", async () => {
    const { onSave, onClose } = setup({ initial: { status: "doing" } });
    expect(screen.getByText("Adds to In progress")).toBeTruthy();
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Write copy");
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    await settle();
    expect(onClose).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: "Write copy", status: "doing" }));
  });

  it("offers people as owner suggestions", () => {
    setup();
    const list = document.getElementById(screen.getByRole("combobox", { name: "Owner" }).getAttribute("list"));
    expect([...list.querySelectorAll("option")].map((o) => o.value)).toEqual(["Ana", "Bo"]);
  });

  it("shows a save error and stays open when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    const { onClose } = setup({ mode: "edit", task, onSave });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await settle();
    expect(screen.getByText("That didn't save. Try again.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("deletes after confirming", async () => {
    const { onDelete } = setup({ mode: "edit", task });
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    const buttons = await screen.findAllByRole("button", { name: "Delete task" });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalled();
  });
});

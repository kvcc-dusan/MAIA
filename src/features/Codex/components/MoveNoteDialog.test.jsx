// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoveNoteDialog from "./MoveNoteDialog.jsx";

const folders = ["Areas", "Omnis", "Omnis/PROJECTS"];
const note = { id: "n1", title: "OWL", folder: "Omnis" };

const renderDialog = (props = {}) => {
  const handlers = { onMove: vi.fn(), onClose: vi.fn() };
  render(<MoveNoteDialog note={note} folders={folders} {...handlers} {...props} />);
  return handlers;
};

const pickRow = (name) => screen.getByRole("button", { name: new RegExp(`^${name}(,|$)`) });

describe("MoveNoteDialog", () => {
  afterEach(cleanup);

  it("lists Vault root and every folder, depth-first", () => {
    renderDialog();
    const rows = within(screen.getByRole("list")).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual(["Vault root", "Areas", "Omnis", "PROJECTS"]);
  });

  it("marks the note's current folder", () => {
    renderDialog();
    expect(pickRow("Omnis").getAttribute("aria-current")).toBe("true");
    expect(pickRow("Omnis").getAttribute("aria-label")).toBe("Omnis, current folder");
    expect(pickRow("Vault root").getAttribute("aria-current")).toBeNull();
  });

  it("disables the current folder so it cannot be picked", async () => {
    const user = userEvent.setup();
    const { onMove, onClose } = renderDialog();
    const current = pickRow("Omnis");
    expect(current.disabled).toBe(true);
    await user.click(current);
    expect(onMove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(current);
  });

  it("keeps the disabled current folder out of the tab order", async () => {
    const user = userEvent.setup();
    renderDialog();
    const current = pickRow("Omnis");
    pickRow("Vault root").focus();
    await user.tab();
    expect(document.activeElement).not.toBe(current);
    expect(document.activeElement).toBe(pickRow("Areas"));
  });

  it("marks Vault root as current for a note at the root", () => {
    renderDialog({ note: { id: "n2", title: "Readme", folder: "" } });
    expect(pickRow("Vault root").getAttribute("aria-current")).toBe("true");
  });

  it("calls onMove with the chosen folder path", () => {
    const { onMove } = renderDialog();
    fireEvent.click(pickRow("Areas"));
    expect(onMove).toHaveBeenCalledWith("Areas");
  });

  it("calls onMove with an empty path for Vault root", () => {
    const { onMove } = renderDialog();
    fireEvent.click(pickRow("Vault root"));
    expect(onMove).toHaveBeenCalledWith("");
  });

  it("closes without moving on Cancel", () => {
    const { onMove, onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("closes without moving on Escape", () => {
    const { onMove, onClose } = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("renders nothing while no note is given", () => {
    renderDialog({ note: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the element that had it before opening", async () => {
    const Harness = () => {
      const [moving, setMoving] = useState(null);
      return (
        <>
          <button type="button" onClick={() => setMoving(note)}>Open picker</button>
          <MoveNoteDialog note={moving} folders={folders} onMove={() => setMoving(null)} onClose={() => setMoving(null)} />
        </>
      );
    };
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open picker" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});

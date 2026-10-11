// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotesSidebar from "./NotesSidebar.jsx";
import { EXPANDED_KEY } from "../useExpandedFolders.js";
import { AUTO_REVEAL_KEY } from "../useAutoReveal.js";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notes = [
  { id: "r", title: "Readme", folder: "" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
  { id: "o", title: "OWL", folder: "Omnis/PROJECTS" },
];
const folders = ["Areas", "Omnis", "Omnis/PROJECTS"];

const setup = (props = {}) => {
  const handlers = { onOpenNote: vi.fn(), onCreateNote: vi.fn(), onCreateJournal: vi.fn() };
  render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} {...handlers} {...props} />);
  return handlers;
};
const labels = () => screen.getAllByRole("treeitem").map((el) => el.textContent.replace(/\d+$/, ""));

describe("NotesSidebar tree", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("renders collapsed folders first, then root notes", () => {
    setup();
    expect(labels()).toEqual(["Areas", "Omnis", "Readme"]);
    expect(screen.getByText("3 notes")).toBeTruthy();
  });

  it("expands and collapses on click and persists the state", () => {
    setup();
    fireEvent.click(screen.getByText("Omnis"));
    expect(labels()).toEqual(["Areas", "Omnis", "PROJECTS", "AGENTS", "Readme"]);
    expect(screen.getByText("Omnis").closest("[role=treeitem]").getAttribute("aria-expanded")).toBe("true");
    expect(JSON.parse(localStorage.getItem(EXPANDED_KEY))).toEqual(["Omnis"]);
    fireEvent.click(screen.getByText("Omnis"));
    expect(labels()).toEqual(["Areas", "Omnis", "Readme"]);
  });

  it("opens a note on click", () => {
    const { onOpenNote } = setup();
    fireEvent.click(screen.getByText("Readme"));
    expect(onOpenNote).toHaveBeenCalledWith("r");
  });

  it("marks the active note current and reveals it when auto-reveal is on", () => {
    localStorage.setItem(AUTO_REVEAL_KEY, "true");
    setup({ currentNoteId: "o" });
    expect(labels()).toContain("OWL");
    expect(screen.getByText("OWL").closest("[role=treeitem]").getAttribute("aria-current")).toBe("true");
  });

  it("supports arrow keys, Enter and Space", () => {
    const { onOpenNote } = setup();
    const first = screen.getAllByRole("treeitem")[0];
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const omnis = screen.getByText("Omnis").closest("[role=treeitem]");
    expect(document.activeElement).toBe(omnis);
    fireEvent.keyDown(omnis, { key: "ArrowRight" });
    expect(omnis.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(omnis, { key: "ArrowRight" });
    expect(document.activeElement.textContent).toContain("PROJECTS");
    fireEvent.keyDown(document.activeElement, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(omnis);
    fireEvent.keyDown(omnis, { key: "ArrowLeft" });
    expect(omnis.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(omnis, { key: " " });
    expect(omnis.getAttribute("aria-expanded")).toBe("true");
    const readme = screen.getByText("Readme").closest("[role=treeitem]");
    fireEvent.keyDown(readme, { key: "Enter" });
    expect(onOpenNote).toHaveBeenCalledWith("r");
  });

  it("creates new notes in the selected folder", () => {
    const { onCreateNote } = setup();
    fireEvent.click(screen.getByLabelText("New note"));
    expect(onCreateNote).toHaveBeenLastCalledWith("");
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByLabelText("New note"));
    expect(onCreateNote).toHaveBeenLastCalledWith("Omnis");
  });

  it("creates a folder under the selected folder", async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined);
    setup({ onCreateFolder });
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByLabelText("New folder"));
    fireEvent.change(await screen.findByLabelText("Folder name"), { target: { value: "Ideas" } });
    fireEvent.click(screen.getByRole("button", { name: "Create folder" }));
    await waitFor(() => expect(onCreateFolder).toHaveBeenCalledWith("Omnis/Ideas"));
  });

  it("works with no folders prop and shows the empty state", () => {
    cleanup();
    render(<NotesSidebar notes={[]} currentNoteId={null} onOpenNote={() => {}} />);
    expect(screen.getByText(/No notes yet/)).toBeTruthy();
  });
});

describe("tree indent guides", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("gives each row its depth so the guide lines span the ancestor levels", () => {
    setup();
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByText("PROJECTS"));
    const depthOf = (name) => screen.getByText(name).closest("[role=treeitem]").style.getPropertyValue("--depth");
    expect(depthOf("Omnis")).toBe("0");
    expect(depthOf("PROJECTS")).toBe("1");
    expect(depthOf("OWL")).toBe("2");
    expect(depthOf("Readme")).toBe("0");
  });
});

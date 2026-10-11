// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotesSidebar from "./NotesSidebar.jsx";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notes = [
  { id: "r", title: "Readme", folder: "" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
];
const folders = ["Areas", "Omnis"];

const setup = (props = {}) => {
  const handlers = { onOpenNote: vi.fn(), onCreateNote: vi.fn(), onCreateFolder: vi.fn(), onMoveNote: vi.fn() };
  render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} {...handlers} {...props} />);
  return handlers;
};

const rowFor = (title) => screen.getByText(title).closest("[role=treeitem]");
const contextMenuOn = (el) => fireEvent.contextMenu(el);
const menuItem = (name) => screen.queryByRole("menuitem", { name });

describe("NotesSidebar context menu", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("offers Move to folder on a note and opens the picker for that note", async () => {
    setup();
    fireEvent.click(screen.getByText("Omnis"));
    contextMenuOn(rowFor("AGENTS"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
    expect(await screen.findByRole("dialog", { name: "Move to folder" })).toBeTruthy();
    expect(screen.getByText(/Choose where "AGENTS" should live/)).toBeTruthy();
  });

  // Fixed in the a11y pass: NotesSidebar hands focus back to the row the menu was opened on.
  it("returns focus to the note row when the move picker is cancelled", async () => {
    setup();
    fireEvent.click(screen.getByText("Omnis"));
    const row = rowFor("AGENTS");
    row.focus();
    contextMenuOn(row);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(row);
  });

  it("offers New note here and New folder here on a folder, without Move", async () => {
    setup();
    contextMenuOn(rowFor("Areas"));
    expect(await screen.findByRole("menuitem", { name: "New note here" })).toBeTruthy();
    expect(menuItem("New folder here")).toBeTruthy();
    expect(menuItem("Move to folder")).toBeNull();
  });

  it("creates a note in the folder that was right-clicked", async () => {
    const { onCreateNote } = setup();
    contextMenuOn(rowFor("Areas"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "New note here" }));
    expect(onCreateNote).toHaveBeenCalledWith("Areas");
  });

  it("opens the new folder dialog under the right-clicked folder", async () => {
    const { onCreateFolder } = setup();
    contextMenuOn(rowFor("Omnis"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "New folder here" }));
    expect(screen.getByText("Created in Omnis.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Ideas" } });
    fireEvent.click(screen.getByRole("button", { name: "Create folder" }));
    expect(onCreateFolder).toHaveBeenCalledWith("Omnis/Ideas");
  });

  it("offers New note here and New folder here on blank space", async () => {
    setup();
    contextMenuOn(screen.getByRole("tree"));
    expect(await screen.findByRole("menuitem", { name: "New note here" })).toBeTruthy();
    expect(menuItem("New folder here")).toBeTruthy();
    expect(menuItem("Move to folder")).toBeNull();
  });

  it("blank space creates at the vault root even when a folder is selected", async () => {
    const { onCreateNote } = setup();
    fireEvent.click(screen.getByText("Omnis"));
    contextMenuOn(screen.getByRole("tree"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "New note here" }));
    expect(onCreateNote).toHaveBeenCalledWith("");
  });

  it("blank space opens the new folder dialog at the vault root even when a folder is selected", async () => {
    const { onCreateFolder } = setup();
    fireEvent.click(screen.getByText("Omnis"));
    contextMenuOn(screen.getByRole("tree"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "New folder here" }));
    expect(screen.getByText("Created in Vault root.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Ideas" } });
    fireEvent.click(screen.getByRole("button", { name: "Create folder" }));
    expect(onCreateFolder).toHaveBeenCalledWith("Ideas");
  });

  it("blank space creates at the root when nothing is selected", async () => {
    const { onCreateNote } = setup();
    contextMenuOn(screen.getByRole("tree"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "New note here" }));
    expect(onCreateNote).toHaveBeenCalledWith("");
  });
});

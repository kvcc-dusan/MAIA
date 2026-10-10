// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import NotesSidebar from "./NotesSidebar.jsx";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notes = [{ id: "a", title: "AGENTS", folder: "Omnis" }];
const folders = ["Areas", "Omnis", "Omnis/PROJECTS"];

const openNewFolder = ({ onCreateFolder = vi.fn().mockResolvedValue(undefined) } = {}) => {
  render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} onOpenNote={() => {}} onCreateFolder={onCreateFolder} />);
  fireEvent.click(screen.getByLabelText("New folder"));
  return { onCreateFolder, input: screen.getByLabelText("Folder name") };
};

const submit = (value) => {
  const input = screen.getByLabelText("Folder name");
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Create folder" }));
};

describe("NotesSidebar new folder", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(toast.error).mockClear();
  });
  afterEach(cleanup);

  it("rejects an empty name", () => {
    const { onCreateFolder } = openNewFolder();
    submit("   ");
    expect(screen.getByText("Folder name can't be empty.")).toBeTruthy();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it("rejects a name containing a slash", () => {
    const { onCreateFolder } = openNewFolder();
    submit("Ideas/Sub");
    expect(screen.getByText("Folder names can't contain slashes.")).toBeTruthy();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it.each([".", ".."])("rejects the reserved name %s", (name) => {
    const { onCreateFolder } = openNewFolder();
    submit(name);
    expect(screen.getByText("Choose a different name.")).toBeTruthy();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it("rejects a name that already exists at the same level, ignoring case", () => {
    const { onCreateFolder } = openNewFolder();
    submit("areas");
    expect(screen.getByText("A folder with that name already exists here.")).toBeTruthy();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it("allows a name that exists only at a different level", () => {
    const { onCreateFolder } = openNewFolder();
    submit("PROJECTS");
    expect(screen.queryByText("A folder with that name already exists here.")).toBeNull();
    expect(onCreateFolder).toHaveBeenCalledWith("PROJECTS");
  });

  it("checks duplicates against the parent it is created in", async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined);
    render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} onOpenNote={() => {}} onCreateFolder={onCreateFolder} />);
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByLabelText("New folder"));
    expect(screen.getByText("Created in Omnis.")).toBeTruthy();
    submit("projects");
    expect(screen.getByText("A folder with that name already exists here.")).toBeTruthy();
    submit("Ideas");
    await waitFor(() => expect(onCreateFolder).toHaveBeenCalledWith("Omnis/Ideas"));
  });

  it("creates the joined path, closes the dialog and selects the new folder", async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} onOpenNote={() => {}} onCreateFolder={onCreateFolder} />);
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByLabelText("New folder"));
    submit("  Ideas  ");
    await waitFor(() => expect(onCreateFolder).toHaveBeenCalledWith("Omnis/Ideas"));
    await waitFor(() => expect(screen.queryByLabelText("Folder name")).toBeNull());
    // The vault echoes the new folder back through the folders prop.
    rerender(<NotesSidebar notes={notes} folders={[...folders, "Omnis/Ideas"]} currentNoteId={null} onOpenNote={() => {}} onCreateFolder={onCreateFolder} />);
    expect(screen.getByText("Ideas").closest("[role=treeitem]").getAttribute("data-selected")).toBe("true");
  });

  it("shows an error toast and keeps the dialog open when creation fails", async () => {
    const onCreateFolder = vi.fn().mockRejectedValue(new Error("Disk is full"));
    openNewFolder({ onCreateFolder });
    submit("Ideas");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't create the folder: Disk is full"));
    expect(screen.getByLabelText("Folder name").value).toBe("Ideas");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("falls back to a generic message when the failure is not an Error", async () => {
    const onCreateFolder = vi.fn().mockRejectedValue("nope");
    openNewFolder({ onCreateFolder });
    submit("Ideas");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't create the folder: Something went wrong."));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("explains when the vault has no folder support", async () => {
    render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} onOpenNote={() => {}} />);
    fireEvent.click(screen.getByLabelText("New folder"));
    submit("Ideas");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't create the folder: This vault can't create folders yet."));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

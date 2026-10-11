// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CodexPage from "./CodexPage.jsx";

const mockData = vi.hoisted(() => ({ createNote: vi.fn(), notesMeta: undefined }));

vi.mock("@/context/DataContext.jsx", () => ({ useData: () => mockData }));
// The shell portals are not under test; render their children in place.
vi.mock("@/components/shell/ShellContext", () => ({
  ShellSidebar: ({ children }) => children,
  ShellTopBar: ({ children }) => children,
}));
vi.mock("@/pages/NotesPage.jsx", () => ({ default: () => <div>notes cards</div> }));
vi.mock("@/pages/EditorPage.jsx", () => ({ default: () => <div>editor</div> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notes = [
  { id: "r", title: "Readme", folder: "" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
  { id: "o", title: "OWL", folder: "Omnis/PROJECTS" },
];

const noteTab = (noteId) => ({ id: `t-${noteId}`, kind: "note", noteId });

const makeCodex = ({ activeTab = noteTab("a") } = {}) => {
  const codex = {
    tabs: [activeTab],
    activeTab,
    activeNoteId: activeTab.kind === "note" ? activeTab.noteId : null,
    openNote: vi.fn(),
    activate: vi.fn(),
    close: vi.fn(),
    newTab: vi.fn(),
    openNotesView: vi.fn(),
  };
  return codex;
};

const setup = ({ activeTab, props = {} } = {}) => {
  const codex = makeCodex({ activeTab });
  const handlers = {
    updateNote: vi.fn(),
    onCreateNote: vi.fn(),
    onCreateJournal: vi.fn(),
    onOpenPalette: vi.fn(),
  };
  render(<CodexPage codex={codex} notes={notes} projects={[]} onDelete={vi.fn()} onDeleteAll={vi.fn()} onRename={vi.fn()} onMove={vi.fn()} onOpenInternalLink={vi.fn()} {...handlers} {...props} />);
  return { codex, ...handlers };
};

const sidebar = () => screen.getByRole("navigation", { name: "Notes" });
const sidebarButton = (label) => within(sidebar()).getByLabelText(label);

describe("CodexPage folder-aware note creation", () => {
  beforeEach(() => {
    localStorage.clear();
    mockData.createNote.mockReset().mockReturnValue("new-id");
    mockData.notesMeta = { folders: ["Areas", "Omnis", "Omnis/PROJECTS"], createFolder: vi.fn() };
  });
  afterEach(cleanup);

  it("the sidebar New note button uses the active note's folder when no folder is selected", () => {
    const { codex } = setup({ activeTab: noteTab("o") });
    fireEvent.click(sidebarButton("New note"));
    expect(mockData.createNote).toHaveBeenCalledWith({ folder: "Omnis/PROJECTS" });
    expect(codex.openNote).toHaveBeenCalledWith("new-id");
  });

  it("the sidebar New note button uses the selected folder over the active note's folder", () => {
    setup({ activeTab: noteTab("o") });
    fireEvent.click(within(sidebar()).getByText("Areas"));
    fireEvent.click(sidebarButton("New note"));
    expect(mockData.createNote).toHaveBeenCalledWith({ folder: "Areas" });
  });

  it("creates at the vault root when neither a folder nor an active note is set", () => {
    setup({ activeTab: { id: "t-new", kind: "new" } });
    fireEvent.click(sidebarButton("New note"));
    expect(mockData.createNote).toHaveBeenCalledWith({});
  });

  it("creates at the vault root when the active note is in the root", () => {
    setup({ activeTab: noteTab("r") });
    fireEvent.click(sidebarButton("New note"));
    expect(mockData.createNote).toHaveBeenCalledWith({});
  });

  it("normalises the active note's folder before creating in it", () => {
    const messy = [{ id: "m", title: "Messy", folder: " Omnis / PROJECTS/ " }];
    const { codex } = setup({ activeTab: noteTab("m"), props: { notes: messy } });
    fireEvent.keyDown(window, { key: "n", metaKey: true });
    expect(mockData.createNote).toHaveBeenCalledWith({ folder: "Omnis/PROJECTS" });
    expect(codex.openNote).toHaveBeenCalledWith("new-id");
  });

  it("Cmd+N creates in the active note's folder", () => {
    const { codex } = setup({ activeTab: noteTab("a") });
    fireEvent.keyDown(window, { key: "n", metaKey: true });
    expect(mockData.createNote).toHaveBeenCalledWith({ folder: "Omnis" });
    expect(codex.openNote).toHaveBeenCalledWith("new-id");
  });

  it("Cmd+N ignores the sidebar selection and uses the active note's folder", () => {
    setup({ activeTab: noteTab("a") });
    fireEvent.click(within(sidebar()).getByText("Areas"));
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(mockData.createNote).toHaveBeenCalledWith({ folder: "Omnis" });
  });

  it("Cmd+N does nothing while a dialog is open", () => {
    setup({ activeTab: noteTab("a") });
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    fireEvent.keyDown(window, { key: "n", metaKey: true });
    expect(mockData.createNote).not.toHaveBeenCalled();
    dialog.remove();
  });

  it("the new-tab page's New note goes through the root handler, not the folder", () => {
    const { onCreateNote } = setup({ activeTab: { id: "t-new", kind: "new" } });
    const pill = screen.getAllByRole("button").find((b) => !sidebar().contains(b) && b.textContent.includes("New note"));
    fireEvent.click(pill);
    expect(onCreateNote).toHaveBeenCalledTimes(1);
    // The click event must not reach the handler; it would be read as a folder path.
    expect(onCreateNote).toHaveBeenCalledWith();
    expect(mockData.createNote).not.toHaveBeenCalled();
  });

  it("moves a note through updateNote when the picker chooses a folder", () => {
    const { updateNote } = setup({ activeTab: noteTab("o") });
    fireEvent.contextMenu(within(sidebar()).getByText("OWL").closest("[role=treeitem]"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Move to folder" }));
    fireEvent.click(screen.getByRole("button", { name: /^Areas/ }));
    expect(updateNote).toHaveBeenCalledWith("o", { folder: "Areas" });
  });
});

describe("CodexPage tab panel", () => {
  afterEach(cleanup);

  it("wraps the active tab's content in a tabpanel labelled by its tab", () => {
    mockData.notesMeta = { folders: [], createFolder: vi.fn() };
    setup({ activeTab: noteTab("a") });
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe("codex-tab-t-a");
    expect(within(panel).getByText("editor")).toBeTruthy();
  });
});

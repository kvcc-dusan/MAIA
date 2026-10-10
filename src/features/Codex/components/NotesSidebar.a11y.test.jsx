// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesSidebar from "./NotesSidebar.jsx";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notes = [
  { id: "r", title: "Readme", folder: "" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
  { id: "o", title: "OWL", folder: "Omnis/PROJECTS" },
  { id: "b", title: "Briefing", folder: "Areas" },
];
const folders = ["Areas", "Omnis", "Omnis/PROJECTS"];

const setup = (props = {}) => {
  const user = userEvent.setup();
  const handlers = { onOpenNote: vi.fn(), onCreateNote: vi.fn(), onCreateJournal: vi.fn(), onMoveNote: vi.fn() };
  render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} {...handlers} {...props} />);
  return { user, ...handlers };
};
const item = (name) => screen.getByRole("treeitem", { name: new RegExp(`^${name}(,|$)`) });

describe("file tree ARIA", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("is a labelled tree with one tab stop", () => {
    setup();
    expect(screen.getByRole("tree", { name: "Notes and folders" })).toBeTruthy();
    const stops = screen.getAllByRole("treeitem").filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
  });

  it("counts siblings, not rows, for setsize and posinset", async () => {
    const { user } = setup();
    await user.click(screen.getByText("Omnis"));
    // Root level: Areas, Omnis, Readme
    expect(item("Omnis").getAttribute("aria-posinset")).toBe("2");
    expect(item("Omnis").getAttribute("aria-setsize")).toBe("3");
    expect(item("Readme").getAttribute("aria-posinset")).toBe("3");
    // Inside Omnis: PROJECTS, AGENTS
    expect(item("PROJECTS").getAttribute("aria-level")).toBe("2");
    expect(item("PROJECTS").getAttribute("aria-setsize")).toBe("2");
    expect(item("AGENTS").getAttribute("aria-posinset")).toBe("2");
  });

  it("puts aria-expanded on folders only", () => {
    setup();
    expect(item("Omnis").getAttribute("aria-expanded")).toBe("false");
    expect(item("Readme").hasAttribute("aria-expanded")).toBe(false);
  });

  it("names folders with their note count", () => {
    setup();
    expect(screen.getByRole("treeitem", { name: "Omnis, 2 notes" })).toBeTruthy();
    expect(screen.getByRole("treeitem", { name: "Areas, 1 note" })).toBeTruthy();
  });

  it("marks the open note as selected and current", () => {
    setup({ currentNoteId: "r" });
    expect(item("Readme").getAttribute("aria-selected")).toBe("true");
    expect(item("Readme").getAttribute("aria-current")).toBe("true");
    expect(item("Omnis").getAttribute("aria-selected")).toBe("false");
  });
});

describe("file tree keyboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("moves with Home and End and keeps a single roving tab stop", async () => {
    const { user } = setup();
    item("Areas").focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(item("Readme"));
    expect(item("Readme").tabIndex).toBe(0);
    expect(item("Areas").tabIndex).toBe(-1);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(item("Areas"));
  });

  it("jumps to the row whose name starts with the typed letters", async () => {
    const { user } = setup();
    item("Areas").focus();
    await user.keyboard("r");
    expect(document.activeElement).toBe(item("Readme"));
    // Typed fast, "re" is one search; "ro" matches nothing and must not move focus.
    await user.keyboard("o");
    expect(document.activeElement).toBe(item("Readme"));
  });

  it("starts a new search after a pause", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { user } = setup();
      item("Areas").focus();
      await user.keyboard("r");
      vi.advanceTimersByTime(1000);
      await user.keyboard("o");
      expect(document.activeElement).toBe(item("Omnis"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens every folder at this level with *", async () => {
    const { user } = setup();
    item("Areas").focus();
    await user.keyboard("*");
    expect(item("Areas").getAttribute("aria-expanded")).toBe("true");
    expect(item("Omnis").getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps focus on the folder when it collapses", async () => {
    const { user } = setup();
    item("Omnis").focus();
    await user.keyboard("{ArrowRight}");
    expect(item("Omnis").getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{ArrowLeft}");
    expect(item("Omnis").getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(item("Omnis"));
  });
});

describe("file tree context menu by keyboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it.each([["{ContextMenu}"], ["{Shift>}{F10}{/Shift}"]])("opens the row menu with %s and Escape returns focus to the row", async (keys) => {
    const { user } = setup();
    item("Readme").focus();
    await user.keyboard(keys);
    expect(await screen.findByRole("menuitem", { name: "Move to folder" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menuitem", { name: "Move to folder" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(item("Readme")));
  });
});

describe("move dialog focus", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("is labelled, starts on the current folder, and hands focus back to the row", async () => {
    const { user } = setup();
    await user.click(screen.getByText("Omnis"));
    item("AGENTS").focus();
    await user.keyboard("{ContextMenu}");
    await user.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
    const dialog = await screen.findByRole("dialog", { name: "Move to folder" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Omnis, current folder"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(item("AGENTS")));
  });

  it("lands on the moved note after choosing a folder", async () => {
    const { user, onMoveNote } = setup();
    item("Readme").focus();
    await user.keyboard("{ContextMenu}");
    await user.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
    await user.click(await screen.findByRole("button", { name: "Omnis" }));
    await waitFor(() => expect(onMoveNote).toHaveBeenCalledWith("r", "Omnis"));
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  TABS_KEY,
  codexTabsReducer as reduce,
  createInitialState,
  loadTabsState,
  moveTab,
  sanitizeState,
  saveTabsState,
  tabTitle,
} from "./codexTabs.js";

const notesTab = (id = "n") => ({ id, kind: "notes" });
const noteTab = (id, noteId) => ({ id, kind: "note", noteId });
const newTab = (id = "x") => ({ id, kind: "new" });
const st = (tabs, activeId) => ({ tabs, activeId });

describe("open", () => {
  it("activates an existing tab for the note", () => {
    const s = st([noteTab("a", "1"), noteTab("b", "2")], "a");
    expect(reduce(s, { type: "open", noteId: "2", id: "z" })).toEqual(st(s.tabs, "b"));
  });

  it("replaces an active notes tab, keeping its id", () => {
    const s = st([notesTab("n"), noteTab("a", "1")], "n");
    expect(reduce(s, { type: "open", noteId: "2", id: "z" })).toEqual(
      st([noteTab("n", "2"), noteTab("a", "1")], "n")
    );
  });

  it("replaces an active new tab", () => {
    const s = st([noteTab("a", "1"), newTab("x")], "x");
    expect(reduce(s, { type: "open", noteId: "2", id: "z" })).toEqual(
      st([noteTab("a", "1"), noteTab("x", "2")], "x")
    );
  });

  it("adds a tab after the active note tab", () => {
    const s = st([noteTab("a", "1"), noteTab("b", "2")], "a");
    expect(reduce(s, { type: "open", noteId: "3", id: "z" })).toEqual(
      st([noteTab("a", "1"), noteTab("z", "3"), noteTab("b", "2")], "z")
    );
  });

  it("does not replace an inactive new tab", () => {
    const s = st([noteTab("a", "1"), newTab("x")], "a");
    const next = reduce(s, { type: "open", noteId: "2", id: "z" });
    expect(next.tabs.map((t) => t.id)).toEqual(["a", "z", "x"]);
  });
});

describe("close", () => {
  const s = st([noteTab("a", "1"), noteTab("b", "2"), noteTab("c", "3")], "b");

  it("activates the right neighbour", () => {
    expect(reduce(s, { type: "close", id: "b" })).toEqual(st([s.tabs[0], s.tabs[2]], "c"));
  });

  it("falls back to the left neighbour", () => {
    expect(reduce(st(s.tabs, "c"), { type: "close", id: "c" }).activeId).toBe("b");
  });

  it("keeps the active tab when closing another", () => {
    expect(reduce(s, { type: "close", id: "a" }).activeId).toBe("b");
  });

  it("leaves one notes tab when the last tab closes", () => {
    const next = reduce(st([noteTab("a", "1")], "a"), { type: "close", id: "a", newId: "q" });
    expect(next).toEqual(st([notesTab("q")], "q"));
  });

  it("keeps a sole notes tab as is", () => {
    const only = st([notesTab("n")], "n");
    expect(reduce(only, { type: "close", id: "n" })).toBe(only);
  });

  it("ignores unknown ids", () => {
    expect(reduce(s, { type: "close", id: "nope" })).toBe(s);
  });
});

describe("activate, newTab, openNotesView", () => {
  it("activates only existing tabs", () => {
    const s = st([notesTab("n"), noteTab("a", "1")], "n");
    expect(reduce(s, { type: "activate", id: "a" }).activeId).toBe("a");
    expect(reduce(s, { type: "activate", id: "zz" })).toBe(s);
  });

  it("newTab inserts after the active tab and activates it", () => {
    const s = st([noteTab("a", "1"), noteTab("b", "2")], "a");
    expect(reduce(s, { type: "newTab", id: "z" })).toEqual(
      st([noteTab("a", "1"), newTab("z"), noteTab("b", "2")], "z")
    );
  });

  it("openNotesView activates an existing notes tab", () => {
    const s = st([noteTab("a", "1"), notesTab("n")], "a");
    expect(reduce(s, { type: "openNotesView", id: "z" }).activeId).toBe("n");
  });

  it("openNotesView turns an active new tab into notes", () => {
    const s = st([noteTab("a", "1"), newTab("x")], "x");
    expect(reduce(s, { type: "openNotesView", id: "z" })).toEqual(st([noteTab("a", "1"), notesTab("x")], "x"));
  });

  it("openNotesView adds a tab otherwise", () => {
    const s = st([noteTab("a", "1")], "a");
    expect(reduce(s, { type: "openNotesView", id: "z" })).toEqual(st([noteTab("a", "1"), notesTab("z")], "z"));
  });
});

describe("removeNote and pruneNotes", () => {
  it("closes every tab of a deleted note and moves the active tab", () => {
    const s = st([noteTab("a", "1"), noteTab("b", "2"), noteTab("c", "3")], "b");
    expect(reduce(s, { type: "removeNote", noteId: "2" })).toEqual(st([s.tabs[0], s.tabs[2]], "c"));
  });

  it("leaves a notes tab when the only note tab is removed", () => {
    const s = st([noteTab("a", "1")], "a");
    const next = reduce(s, { type: "removeNote", noteId: "1", newId: "q" });
    expect(next).toEqual(st([notesTab("q")], "q"));
  });

  it("returns the same state when nothing matches", () => {
    const s = st([noteTab("a", "1")], "a");
    expect(reduce(s, { type: "removeNote", noteId: "9" })).toBe(s);
    expect(reduce(s, { type: "pruneNotes", noteIds: ["1"] })).toBe(s);
  });

  it("prunes note tabs whose note is gone", () => {
    const s = st([notesTab("n"), noteTab("a", "1"), noteTab("b", "2")], "a");
    expect(reduce(s, { type: "pruneNotes", noteIds: ["2"] })).toEqual(st([notesTab("n"), noteTab("b", "2")], "b"));
  });
});

describe("persistence", () => {
  beforeEach(() => localStorage.clear());

  it("sanitize drops unknown kinds, dupes, and bad shapes", () => {
    const raw = {
      tabs: [
        notesTab("n"),
        { id: "j", kind: "weird" },
        noteTab("a", "1"),
        noteTab("b", "1"),
        { id: "c", kind: "note" },
        null,
        newTab("x"),
        { kind: "new" },
      ],
      activeId: "a",
    };
    expect(sanitizeState(raw)).toEqual(st([notesTab("n"), noteTab("a", "1"), newTab("x")], "a"));
  });

  it("sanitize keeps one notes tab and unique tab ids", () => {
    const out = sanitizeState({ tabs: [notesTab("n"), notesTab("n"), notesTab("m")], activeId: "m" });
    expect(out).toEqual(st([notesTab("n")], "n"));
  });

  it("sanitize repairs a missing activeId and empty lists", () => {
    expect(sanitizeState({ tabs: [noteTab("a", "1")], activeId: "gone" }).activeId).toBe("a");
    const empty = sanitizeState({ tabs: [], activeId: null });
    expect(empty.tabs).toHaveLength(1);
    expect(empty.tabs[0].kind).toBe("notes");
    expect(empty.activeId).toBe(empty.tabs[0].id);
    expect(sanitizeState("garbage").tabs[0].kind).toBe("notes");
  });

  it("round-trips through storage", () => {
    const s = st([notesTab("n"), noteTab("a", "1")], "a");
    saveTabsState(s);
    expect(loadTabsState()).toEqual(s);
  });

  it("returns null for missing or corrupt storage", () => {
    expect(loadTabsState()).toBeNull();
    localStorage.setItem(TABS_KEY, "{nope");
    expect(loadTabsState()).toBeNull();
  });

  it("createInitialState can seed an open note", () => {
    const s = createInitialState("42");
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0]).toMatchObject({ kind: "note", noteId: "42" });
    expect(s.activeId).toBe(s.tabs[0].id);
    expect(createInitialState().tabs[0].kind).toBe("notes");
  });
});

describe("tabTitle", () => {
  const notes = [{ id: "1", title: "Alpha" }, { id: "2", title: "" }];
  it("names each kind", () => {
    expect(tabTitle(notesTab(), notes)).toBe("Codex");
    expect(tabTitle(newTab(), notes)).toBe("New tab");
    expect(tabTitle(noteTab("a", "1"), notes)).toBe("Alpha");
    expect(tabTitle(noteTab("b", "2"), notes)).toBe("Untitled");
    expect(tabTitle(noteTab("c", "9"), notes)).toBe("Untitled");
  });
});

describe("move", () => {
  const base = () => st([notesTab("n"), noteTab("a", "1"), noteTab("b", "2"), newTab("x")], "a");
  const ids = (s) => s.tabs.map((t) => t.id);

  it("moves a tab right onto a later tab's index", () => {
    const next = reduce(base(), { type: "move", fromId: "n", toId: "b" });
    expect(ids(next)).toEqual(["a", "b", "n", "x"]);
  });

  it("moves a tab left onto an earlier tab's index", () => {
    const next = reduce(base(), { type: "move", fromId: "x", toId: "a" });
    expect(ids(next)).toEqual(["n", "x", "a", "b"]);
  });

  it("swaps two neighbours", () => {
    expect(ids(reduce(base(), { type: "move", fromId: "a", toId: "b" }))).toEqual(["n", "b", "a", "x"]);
    expect(ids(reduce(base(), { type: "move", fromId: "b", toId: "a" }))).toEqual(["n", "b", "a", "x"]);
  });

  it("keeps the active tab active wherever it moves", () => {
    const next = reduce(base(), { type: "move", fromId: "a", toId: "x" });
    expect(next.activeId).toBe("a");
    expect(next.tabs.find((t) => t.id === "a")).toEqual(noteTab("a", "1"));
  });

  it("keeps the active tab when a different tab moves", () => {
    const s = st(base().tabs, "b");
    expect(reduce(s, { type: "move", fromId: "n", toId: "x" }).activeId).toBe("b");
  });

  it("returns the same state for the same position", () => {
    const s = base();
    expect(reduce(s, { type: "move", fromId: "b", toId: "b" })).toBe(s);
    expect(moveTab(s, "b", "b")).toBe(s);
  });

  it("returns the same state for unknown ids", () => {
    const s = base();
    expect(reduce(s, { type: "move", fromId: "nope", toId: "b" })).toBe(s);
    expect(reduce(s, { type: "move", fromId: "b", toId: "nope" })).toBe(s);
  });

  it("does not mutate the previous state", () => {
    const s = base();
    const snapshot = JSON.parse(JSON.stringify(s));
    const next = reduce(s, { type: "move", fromId: "x", toId: "a" });
    expect(next).not.toBe(s);
    expect(next.tabs).not.toBe(s.tabs);
    expect(s).toEqual(snapshot);
  });

  it("keeps every tab, with its data, when reordering", () => {
    const s = base();
    const next = reduce(s, { type: "move", fromId: "b", toId: "n" });
    expect([...next.tabs].sort((p, q) => (p.id < q.id ? -1 : 1))).toEqual([...s.tabs].sort((p, q) => (p.id < q.id ? -1 : 1)));
  });

  it("persists the new order", () => {
    localStorage.clear();
    const next = reduce(base(), { type: "move", fromId: "x", toId: "n" });
    saveTabsState(next);
    expect(loadTabsState()).toEqual(next);
    expect(ids(loadTabsState())).toEqual(["x", "n", "a", "b"]);
  });
});

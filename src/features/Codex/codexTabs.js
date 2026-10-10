import { uid } from "../../lib/ids.js";

export const TABS_KEY = "maia.codex.tabs";
const KINDS = ["notes", "note", "new"];

const makeNotesTab = (id) => ({ id: id ?? uid(), kind: "notes" });

export const createInitialState = (seedNoteId = null) => {
  const tab = seedNoteId
    ? { id: uid(), kind: "note", noteId: seedNoteId }
    : makeNotesTab();
  return { tabs: [tab], activeId: tab.id };
};

/** Title shown on a tab; a note tab follows the note's live title. */
export const tabTitle = (tab, notes) => {
  if (tab.kind === "notes") return "Codex";
  if (tab.kind === "new") return "New tab";
  const note = notes.find((n) => n.id === tab.noteId);
  return note?.title?.trim() || "Untitled";
};

/**
 * Stored JSON is untrusted: it can come from an older build or be hand-edited.
 * Anything malformed is dropped rather than repaired, then the result is made
 * to satisfy the reducer's invariants (at least one tab, activeId exists).
 */
export const sanitizeState = (raw) => {
  const list = Array.isArray(raw?.tabs) ? raw.tabs : [];
  const ids = new Set();
  const noteIds = new Set();
  let hasNotes = false;
  const tabs = [];
  for (const t of list) {
    if (!t || typeof t.id !== "string" || !KINDS.includes(t.kind) || ids.has(t.id)) continue;
    if (t.kind === "note") {
      if (typeof t.noteId !== "string" || !t.noteId || noteIds.has(t.noteId)) continue;
      noteIds.add(t.noteId);
      tabs.push({ id: t.id, kind: "note", noteId: t.noteId });
    } else if (t.kind === "notes") {
      if (hasNotes) continue;
      hasNotes = true;
      tabs.push({ id: t.id, kind: "notes" });
    } else {
      tabs.push({ id: t.id, kind: "new" });
    }
    ids.add(t.id);
  }
  if (tabs.length === 0) return createInitialState();
  const activeId = ids.has(raw.activeId) ? raw.activeId : tabs[0].id;
  return { tabs, activeId };
};

export const loadTabsState = () => {
  try {
    const stored = localStorage.getItem(TABS_KEY);
    return stored ? sanitizeState(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

export const saveTabsState = (state) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(state));
  } catch {
    // storage blocked: tabs last for this session only
  }
};

// Drops every tab the predicate matches. If the active tab goes, the right
// neighbour takes over, else the left one; if nothing is left, a Codex tab.
const removeWhere = (state, shouldRemove, newId) => {
  if (!state.tabs.some(shouldRemove)) return state;
  const activeIndex = state.tabs.findIndex((t) => t.id === state.activeId);
  const tabs = state.tabs.filter((t) => !shouldRemove(t));
  if (tabs.length === 0) {
    const fresh = makeNotesTab(newId);
    return { tabs: [fresh], activeId: fresh.id };
  }
  if (tabs.some((t) => t.id === state.activeId)) return { tabs, activeId: state.activeId };
  const successor = state.tabs.slice(activeIndex + 1).find((t) => !shouldRemove(t));
  const predecessor = state.tabs.slice(0, activeIndex).reverse().find((t) => !shouldRemove(t));
  return { tabs, activeId: (successor ?? predecessor).id };
};

const insertAfterActive = (state, tab) => {
  const at = state.tabs.findIndex((t) => t.id === state.activeId) + 1;
  return { tabs: [...state.tabs.slice(0, at), tab, ...state.tabs.slice(at)], activeId: tab.id };
};

const replaceTab = (state, id, tab) => ({
  ...state,
  tabs: state.tabs.map((t) => (t.id === id ? tab : t)),
});

export const codexTabsReducer = (state, action) => {
  switch (action.type) {
    case "open": {
      const existing = state.tabs.find((t) => t.kind === "note" && t.noteId === action.noteId);
      if (existing) return existing.id === state.activeId ? state : { ...state, activeId: existing.id };
      const active = state.tabs.find((t) => t.id === state.activeId);
      if (active && active.kind !== "note") {
        return replaceTab(state, active.id, { id: active.id, kind: "note", noteId: action.noteId });
      }
      return insertAfterActive(state, { id: action.id ?? uid(), kind: "note", noteId: action.noteId });
    }
    case "activate":
      return state.activeId !== action.id && state.tabs.some((t) => t.id === action.id)
        ? { ...state, activeId: action.id }
        : state;
    case "close": {
      const only = state.tabs.length === 1 && state.tabs[0].id === action.id;
      if (only && state.tabs[0].kind === "notes") return state;
      return removeWhere(state, (t) => t.id === action.id, action.newId);
    }
    case "newTab":
      return insertAfterActive(state, { id: action.id ?? uid(), kind: "new" });
    case "openNotesView": {
      const existing = state.tabs.find((t) => t.kind === "notes");
      if (existing) return existing.id === state.activeId ? state : { ...state, activeId: existing.id };
      const active = state.tabs.find((t) => t.id === state.activeId);
      if (active?.kind === "new") return replaceTab(state, active.id, { id: active.id, kind: "notes" });
      return insertAfterActive(state, makeNotesTab(action.id));
    }
    case "removeNote":
      return removeWhere(state, (t) => t.kind === "note" && t.noteId === action.noteId, action.newId);
    case "pruneNotes": {
      const alive = new Set(action.noteIds);
      return removeWhere(state, (t) => t.kind === "note" && !alive.has(t.noteId), action.newId);
    }
    default:
      return state;
  }
};

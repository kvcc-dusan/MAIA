import { useCallback, useEffect, useMemo, useReducer } from "react";
import { uid } from "../../lib/ids.js";
import {
  codexTabsReducer,
  createInitialState,
  loadTabsState,
  saveTabsState,
} from "./codexTabs.js";

const LEGACY_NOTE_KEY = "maia_current_note_id";

// Before tabs, App kept one "current note" key. Carry it over once so an
// upgrade reopens the note the user was on, then retire the key.
const initState = () => {
  const stored = loadTabsState();
  let legacy = null;
  try {
    legacy = localStorage.getItem(LEGACY_NOTE_KEY);
    if (legacy !== null) localStorage.removeItem(LEGACY_NOTE_KEY);
  } catch {
    // storage blocked: nothing to migrate
  }
  return stored ?? createInitialState(legacy || null);
};

/**
 * Codex tab state with persistence. `isReady` gates pruning: in Tauri the vault
 * loads async, and an empty list during load must not close every note tab.
 */
export const useCodexTabs = ({ notes, isReady }) => {
  const [state, dispatch] = useReducer(codexTabsReducer, undefined, initState);

  useEffect(() => saveTabsState(state), [state]);

  // Covers every way a note disappears (delete, delete all, backup restore).
  useEffect(() => {
    if (!isReady) return;
    dispatch({ type: "pruneNotes", noteIds: notes.map((n) => n.id), newId: uid() });
  }, [notes, isReady]);

  const openNote = useCallback((noteId) => dispatch({ type: "open", noteId, id: uid() }), []);
  const activate = useCallback((id) => dispatch({ type: "activate", id }), []);
  const close = useCallback((id) => dispatch({ type: "close", id, newId: uid() }), []);
  const newTab = useCallback(() => dispatch({ type: "newTab", id: uid() }), []);
  const openNotesView = useCallback(() => dispatch({ type: "openNotesView", id: uid() }), []);
  const moveTab = useCallback((fromId, toId) => dispatch({ type: "move", fromId, toId }), []);

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0],
    [state]
  );
  const activeNoteId = activeTab.kind === "note" ? activeTab.noteId : null;

  return { tabs: state.tabs, activeTab, activeNoteId, openNote, activate, close, newTab, openNotesView, moveTab };
};

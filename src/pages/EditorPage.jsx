import React, { useState, useCallback, useEffect, useRef } from "react";
import EditorRich from "../components/EditorRich.jsx";
import { WriteIcon } from "../components/ui/CustomIcon.jsx";
import { EmptyState } from "../components/composed/EmptyState.jsx";
import { useDebounced } from "../hooks/useDebounced.js";
import NoteHeader from "../features/Codex/NoteHeader.jsx";
import NoteCounters from "../features/Codex/NoteCounters.jsx";
import { countBacklinks } from "../features/Codex/backlinks.js";
import styles from "./EditorPage.module.css";

const modeKey = (id) => `maia:note-mode:${id}`;

// Storage can throw (private windows, blocked site data); these are only
// per-viewer conveniences, so a failure falls back to the default.
const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // lasts for this session only
  }
};

export default function Editor({ note, notes = [], updateNote, onDelete, projects = [], onOpenInternalLink }) {
  const [local, setLocal] = useState(note);
  const [mode, setMode] = useState(() => {
    if (note?.id) return readStored(modeKey(note.id)) === "read" ? "read" : "edit";
    return "edit";
  });

  // Persist
  const savedRef = useRef(note);
  useDebounced(() => {
    if (local) {
      savedRef.current = local;
      updateNote(local);
    }
  }, [local?.title, local?.content, local?.tags, local?.links, local?.wordCount, local?.charCount, local?.project], 250);

  // The debounce cancels when this editor unmounts, which is what switching tabs
  // does. Flush anything typed in that last window so a quick switch loses nothing.
  const localRef = useRef(local);
  localRef.current = local;
  const updateNoteRef = useRef(updateNote);
  updateNoteRef.current = updateNote;
  // A deleted note must not be written back by that same flush.
  const isDeletedRef = useRef(false);
  useEffect(() => () => {
    const pending = localRef.current;
    if (!isDeletedRef.current && pending && pending !== savedRef.current) updateNoteRef.current(pending);
  }, []);

  // These were previously created inline inside JSX props below the early
  // return: a real Rules-of-Hooks violation (hook order changes whenever
  // `note` flips between null and set). Hooks must run unconditionally on
  // every render, so they're defined here instead.
  const handleContentChange = useCallback(
    (md) => setLocal((v) => ({ ...v, content: md })),
    []
  );

  const handleMetaChange = useCallback((meta) => setLocal((v) => {
    // 1. Tags: Replace duplicative merging with direct set (fixes #k #ks #ksva bug)
    const newTags = meta.tags || [];

    // 2. WikiLinks -> Projects
    // A [[Project Name]] in the body ADDS that project. It must never be the
    // whole story: this handler used to return the wikilink-derived list
    // outright, so opening any note whose body had no wikilink silently
    // cleared the links made from Opus: reading a note removed it from its
    // project. Links are unlinked explicitly from the Nodes panel instead.
    const existingIds = v.projectIds || [];
    let newProjectName = null;

    const linkedProjects = meta.links?.length
      ? projects.filter(p => meta.links.some(link => link.toLowerCase() === p.name.toLowerCase()))
      : [];

    if (linkedProjects.length > 0) {
      newProjectName = linkedProjects[0].name; // first match, for the legacy display field
    }

    const newProjectIds = [...new Set([...existingIds, ...linkedProjects.map(p => p.id)])];

    return {
      ...v, ...meta,
      tags: newTags,
      projectIds: newProjectIds,
      project: newProjectName || null
    };
  }), [projects]);

  if (!note) {
    return (
      <div className={styles.page}>
        <EmptyState
          size="page"
          icon={WriteIcon}
          title="No note selected"
          description="Open a note from Codex to start writing."
        />
      </div>
    );
  }

  const editable = mode === "edit";
  const toggleMode = () => {
    const next = mode === "edit" ? "read" : "edit";
    setMode(next);
    if (local?.id) writeStored(modeKey(local.id), next);
  };

  const handleDelete = () => {
    isDeletedRef.current = true;
    onDelete?.(note.id);
  };

  return (
    <div className={styles.page}>
      <NoteHeader
        title={local.title}
        createdAt={local.createdAt}
        content={local.content}
        isEditing={editable}
        onToggleMode={toggleMode}
        onDelete={handleDelete}
      />

      <div className={styles.stage}>
        <div className={`${styles.body} custom-scrollbar`}>
          <div className={styles.content}>
            <input
              value={local.title}
              onChange={(e) => setLocal((v) => ({ ...v, title: e.target.value }))}
              placeholder="Untitled"
              aria-label="Note title"
              className={styles.titleInput}
            />
            {local.tags?.length > 0 && (
              <p className={styles.tags}>
                {local.tags.map((t) => <span key={t}>#{t}</span>)}
              </p>
            )}
            <EditorRich
              value={local.content || ""}
              editable={editable}
              onChange={handleContentChange}
              onMetaChange={handleMetaChange}
              onOpenInternalLink={onOpenInternalLink}
            />
          </div>
        </div>

        <NoteCounters
          backlinks={countBacklinks(notes, local)}
          words={local.wordCount ?? 0}
          characters={local.charCount ?? 0}
        />
      </div>
    </div>
  );
}

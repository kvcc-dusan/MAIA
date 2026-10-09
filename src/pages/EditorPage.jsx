import React, { useState, useCallback } from "react";
import EditorRich from "../components/EditorRich.jsx";
import { CollapseIcon, ExpandIcon, ReadIcon, WriteIcon } from "../components/ui/CustomIcon.jsx";
import { IconButton } from "../components/composed/IconButton.jsx";
import { EmptyState } from "../components/composed/EmptyState.jsx";
import { useDebounced } from "../hooks/useDebounced.js";
import styles from "./EditorPage.module.css";

const modeKey = (id) => `maia:note-mode:${id}`;
const widthKey = () => `maia:editor-wide`;

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

export default function Editor({ note, updateNote, projects = [], onOpenInternalLink }) {
  const [local, setLocal] = useState(note);
  const [mode, setMode] = useState(() => {
    if (note?.id) return readStored(modeKey(note.id)) === "read" ? "read" : "edit";
    return "edit";
  });
  const [wide, setWide] = useState(() => readStored(widthKey()) === "true");

  const toggleWide = () => {
    setWide(prev => {
      const next = !prev;
      writeStored(widthKey(), String(next));
      return next;
    });
  };

  // Persist
  useDebounced(() => {
    if (local) updateNote(local);
  }, [local?.title, local?.content, local?.tags, local?.links, local?.wordCount, local?.charCount, local?.project], 250);

  // These were previously created inline inside JSX props below the early
  // return — a real Rules-of-Hooks violation (hook order changes whenever
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
    // cleared the links made from Opus — reading a note removed it from its
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

  const createdLabel = new Date(local.createdAt).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={styles.page}>
      <div className={styles.column} data-wide={wide}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.heading}>
              <input
                value={local.title}
                onChange={(e) => setLocal({ ...local, title: e.target.value })}
                placeholder="Untitled note"
                aria-label="Note title"
                className={styles.titleInput}
              />
              <div className={styles.meta}>
                <span>{createdLabel}</span>
                {local.project && <span>@{local.project}</span>}
              </div>
            </div>

            <div className={styles.actions}>
              <IconButton
                label={wide ? "Narrow view" : "Wide view"}
                icon={wide ? CollapseIcon : ExpandIcon}
                size="icon-sm"
                variant="outline"
                onClick={toggleWide}
              />
              <IconButton
                label={editable ? "Switch to reading mode" : "Switch to editing mode"}
                icon={editable ? ReadIcon : WriteIcon}
                size="icon-sm"
                variant="outline"
                onClick={toggleMode}
              />
            </div>
          </div>

          <div className={`${styles.body} custom-scrollbar`}>
            <div className={styles.content}>
              <EditorRich
                value={local.content || ""}
                editable={editable}
                onChange={handleContentChange}
                onMetaChange={handleMetaChange}
                onOpenInternalLink={onOpenInternalLink}
              />
            </div>
          </div>

          <div className={styles.status}>
            <span>{(local?.wordCount ?? 0).toLocaleString()} words</span>
            <span>{(local?.charCount ?? 0).toLocaleString()} characters</span>
            <span className={styles.tags}>
              {local.tags && local.tags.length > 0
                ? local.tags.map(t => <span key={t}>#{t}</span>)
                : <span>No tags</span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

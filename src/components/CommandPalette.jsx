// @maia:command-palette
import React, { useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Download,
  FolderPlus,
  Upload,
  StickyNote,
  Clock,
  FolderKanban,
  BookOpen,
  Network,
} from "lucide-react";
import { CommandPalette as ArcPalette } from "@/components/arc/command-palette/command-palette";
import styles from "./CommandPalette.module.css";

/**
 * MAIA's palette: Arc's `command-palette` inside a Radix dialog.
 *
 * Notes are the first group, not the last: the most likely reason to open it
 * is finding a note. An empty query shows the five most recent notes; typing
 * searches the 50 most recent. Arc owns the query state and exposes no hook,
 * so the query is mirrored from the input via bubbled events.
 */

const MAX_NOTE_ITEMS = 50;
const RECENT_NOTE_ITEMS = 5;

const icon = (Icon) => React.createElement(Icon, { size: 16, strokeWidth: 1.75, "aria-hidden": "true" });

const PAGES = [
  { label: "Go to Opus", icon: FolderKanban, to: "projects" },
  { label: "Go to Codex", icon: BookOpen, to: "codex" },
  { label: "Go to Conexa", icon: Network, to: "graph" },
];

function PaletteBody({
  onClose,
  notes,
  onOpenNote,
  onCreateNote,
  onCreateProject,
  go,
  onOpenCronos,
  onExportBackup,
  onImportBackup,
}) {
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  // Read after the palette has handled the event, so clear/Escape resets are caught too.
  const syncQuery = () =>
    requestAnimationFrame(() =>
      setQuery(wrapRef.current?.querySelector("input")?.value ?? "")
    );

  const items = useMemo(() => {
    const sorted = [...notes].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );
    const noteSlice = query.trim()
      ? sorted.slice(0, MAX_NOTE_ITEMS)
      : sorted.slice(0, RECENT_NOTE_ITEMS);

    const noteItems = noteSlice.map((n) => ({
      id: `note-${n.id}`,
      label: n.title || "Untitled",
      group: query.trim() ? "Notes" : "Recent notes",
      icon: icon(StickyNote),
      run: () => onOpenNote?.(n.id),
    }));

    const pageItems = PAGES.map((p) => ({
      id: `go-${p.to}`,
      label: p.label,
      group: "Navigate",
      icon: icon(p.icon),
      run: () => go?.(p.to),
    }));

    const actionItems = [
      { id: "new-note", label: "New note", icon: StickyNote, run: onCreateNote },
      { id: "new-project", label: "New project", icon: FolderPlus, run: onCreateProject },
      { id: "open-chronos", label: "Open Chronos", icon: Clock, run: onOpenCronos },
      { id: "export", label: "Export all data (backup)", icon: Download, run: onExportBackup },
      { id: "import", label: "Import backup", icon: Upload, run: onImportBackup },
    ].map(({ icon: Icon, ...rest }) => ({ ...rest, group: "Actions", icon: icon(Icon) }));

    return [...noteItems, ...pageItems, ...actionItems];
  }, [notes, query, onOpenNote, go, onCreateNote, onCreateProject, onOpenCronos, onExportBackup, onImportBackup]);

  const handleSelect = (item) => {
    onClose();
    item.run?.();
  };

  return (
    <div ref={wrapRef} onInput={syncQuery} onClick={syncQuery} onKeyDown={syncQuery}>
      <ArcPalette
        items={items}
        placeholder="Search commands and notes"
        onSelect={handleSelect}
        onClose={onClose}
        autoFocus
      />
    </div>
  );
}

export default function CommandPalette({ open, onClose, notes = [], ...handlers }) {
  // Escape belongs to the palette while the search box has focus: it clears
  // the query first and closes only when the box is already empty.
  const handleEscape = (event) => {
    if (event.target instanceof HTMLInputElement) event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={styles.content}
          onEscapeKeyDown={handleEscape}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className={styles.srOnly}>Command palette</DialogPrimitive.Title>
          <PaletteBody onClose={onClose} notes={notes} {...handlers} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

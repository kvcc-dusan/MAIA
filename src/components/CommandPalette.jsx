// @maia:command-palette
import React, { useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderAdd,
  StickyNote03,
  ChronosIcon,
  OpusIcon,
  CodexIcon,
  ConnexaIcon,
  LedgerIcon,
  Home08,
} from "./ui/CustomIcon.jsx";
import { Download, Upload } from "lucide-react";

/**
 * Command palette on cmdk.
 *
 * Notes are the first group, not the last: the dock button says "Search", and
 * the most likely reason to open it is finding a note — the old order put
 * notes below Actions and Navigate, then clipped them off behind a 288px
 * list with a hidden scrollbar, so search looked broken.
 *
 * Empty query shows the five most recent notes instead of a static action
 * list. The vendored CommandList's `max-h-72` is overridden here (its cn()
 * merges caller classes) — the `no-scrollbar` class it carries is dead CSS in
 * this repo, so the visible scrollbar comes from `custom-scrollbar`.
 */

const MAX_NOTE_ITEMS = 50;

export default function CommandPalette({
  open,
  onClose,
  notes = [],
  onOpenNote,
  onCreateNote,
  onCreateProject,
  go,
  onOpenCronos,
  onExportBackup,
  onImportBackup,
}) {
  const [query, setQuery] = useState("");

  const run = (fn) => () => {
    onClose();
    fn?.();
  };

  const pages = [
    { label: "Go to Today", icon: Home08, to: "home" },
    { label: "Go to Opus", icon: OpusIcon, to: "projects" },
    { label: "Go to Codex", icon: CodexIcon, to: "overview" },
    { label: "Go to Conexa", icon: ConnexaIcon, to: "graph" },
    { label: "Go to Ledger", icon: LedgerIcon, to: "ledgerPage" },
  ];

  // cmdk filters only what we render. Query empty → recents; typing → the
  // 50 most recent, with a truncation hint when the vault is larger.
  const noteItems = useMemo(() => {
    const sorted = [...notes].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );
    return query.trim() ? sorted.slice(0, MAX_NOTE_ITEMS) : sorted.slice(0, 5);
  }, [notes, query]);

  const notesTruncated = query.trim() && notes.length > MAX_NOTE_ITEMS;

  const resetOnClose = (next) => {
    if (!next) {
      setQuery("");
      onClose();
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={resetOnClose}
      title="Command palette"
      description="Search commands and notes"
      // Centered instead of top-1/3: the list can now be tall, and a 1/3
      // anchor made that height feel arbitrary.
      className="top-1/2 -translate-y-1/2 sm:max-w-xl"
    >
      {/* The base-luma CommandDialog doesn't provide the cmdk root itself —
          without this wrapper the Input/List primitives have no context and
          the palette renders nothing. */}
      <Command>
        <CommandInput
          placeholder="Type a command or search notes…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[min(56vh,30rem)] custom-scrollbar">
          <CommandEmpty>No matching commands or notes.</CommandEmpty>

          {notes.length > 0 && (
            <CommandGroup heading={query.trim() ? "Notes" : "Recent notes"}>
              {noteItems.map((n) => (
                <NoteItem key={n.id} note={n} onOpenNote={onOpenNote} run={run} />
              ))}
              {notesTruncated && (
                <div
                  role="presentation"
                  className="px-3 py-2 text-xs text-faint-foreground"
                >
                  Showing {MAX_NOTE_ITEMS} most recent of {notes.length} notes — keep typing to narrow.
                </div>
              )}
            </CommandGroup>
          )}

          {notes.length > 0 && <CommandSeparator />}

          <CommandGroup heading="Navigate">
            {pages.map((p) => (
              <CommandItem
                key={p.to}
                className="data-selected:bg-overlay"
                onSelect={run(() => go?.(p.to))}
              >
                <p.icon size={16} />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem className="data-selected:bg-overlay" onSelect={run(onCreateNote)}>
              <StickyNote03 size={16} />
              New note
            </CommandItem>
            <CommandItem className="data-selected:bg-overlay" onSelect={run(onCreateProject)}>
              <FolderAdd size={16} />
              New project
            </CommandItem>
            <CommandItem className="data-selected:bg-overlay" onSelect={run(onOpenCronos)}>
              <ChronosIcon size={16} />
              Open Chronos
            </CommandItem>
            <CommandItem className="data-selected:bg-overlay" onSelect={run(onExportBackup)}>
              <Download size={16} />
              Export all data (backup)
            </CommandItem>
            <CommandItem className="data-selected:bg-overlay" onSelect={run(onImportBackup)}>
              <Upload size={16} />
              Import backup…
            </CommandItem>
          </CommandGroup>
        </CommandList>

        {/* Keyboard affordances — none of this was discoverable before. */}
        <div className="flex flex-none items-center justify-end gap-4 border-t border-border-subtle px-4 py-2 text-xs text-faint-foreground">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

function NoteItem({ note, onOpenNote, run }) {
  return (
    <CommandItem
      className="data-selected:bg-overlay"
      value={`note ${note.title || "Untitled"} ${note.id}`}
      onSelect={run(() => onOpenNote?.(note.id))}
    >
      <StickyNote03 size={16} />
      {note.title || "Untitled"}
    </CommandItem>
  );
}

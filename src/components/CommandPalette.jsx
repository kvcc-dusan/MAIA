// @maia:command-palette
import React from "react";
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
 * Command palette on cmdk. The previous version hand-rolled filtering, arrow-key
 * selection and scoring — cmdk owns all of that (plus type-ahead, groups and
 * scroll-into-view, which the old one lacked). It also listed both "Go to Today"
 * and "Go to Home" running the same navigation; there is one entry now.
 */
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Command palette"
      description="Search commands and notes"
    >
      {/* The base-luma CommandDialog doesn't provide the cmdk root itself —
          without this wrapper the Input/List primitives have no context and
          the palette renders nothing. */}
      <Command>
        <CommandInput placeholder="Type a command or search notes…" />
        <CommandList>
          <CommandEmpty>No matching commands or notes.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={run(onCreateNote)}>
            <StickyNote03 size={16} />
            New note
          </CommandItem>
          <CommandItem onSelect={run(onCreateProject)}>
            <FolderAdd size={16} />
            New project
          </CommandItem>
          <CommandItem onSelect={run(onOpenCronos)}>
            <ChronosIcon size={16} />
            Open Chronos
          </CommandItem>
          <CommandItem onSelect={run(onExportBackup)}>
            <Download size={16} />
            Export all data (backup)
          </CommandItem>
          <CommandItem onSelect={run(onImportBackup)}>
            <Upload size={16} />
            Import backup…
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {pages.map((p) => (
            <CommandItem key={p.to} onSelect={run(() => go?.(p.to))}>
              <p.icon size={16} />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {notes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {notes.slice(0, 50).map((n) => (
                <CommandItem
                  key={n.id}
                  value={`note ${n.title || "Untitled"} ${n.id}`}
                  onSelect={run(() => onOpenNote?.(n.id))}
                >
                  <StickyNote03 size={16} />
                  {n.title || "Untitled"}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

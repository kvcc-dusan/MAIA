import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { PageTitle } from "@/components/composed/PageHeader";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/composed/IconButton";
import ProjectIcon from "../components/ProjectIcon";
import { StickyNote03, Pin, CheckmarkSquare02, Delete01, Pen01 } from "../components/ui/CustomIcon.jsx";
import { EmptyState } from "@/components/composed/EmptyState";
import { useData } from "../context/DataContext";
import { AiMagic as Sparkles } from "../components/ui/CustomIcon.jsx";
import { useLongPress } from "../hooks/useLongPress";

/**
 * NotesOverview (Codex)
 * - Refined Aesthetic (Opus Match)
 * - Darker, Prettier Pills
 */

const PIN_LIMIT = 16;

// NoteCard calls this for both real right-clicks and its synthetic
// long-press event. The actual menu is owned by Menu.ContextTrigger, which
// opens natively for both gestures — this stub only keeps that contract
// satisfied (mirrors LedgerPage's DecisionCardMenu).
function handleCardContextMenu(e) {
  e.preventDefault();
}

/**
 * Shared body for the note actions menu — rendered once for the right-click
 * / long-press ContextMenu and once for the "..." dropdown, so the two
 * triggers can't drift out of sync. `ItemC`/`SepC`/`LabelC`/`DangerC` let the
 * caller supply either the Context* or plain Menu.* flavour.
 */
function NoteMenuBody({ note, selectMode, selectedCount, isPinned, actions, ItemC, SepC, LabelC, DangerC }) {
  // Re-bound to capitalized locals: eslint's plain no-unused-vars (no
  // react plugin here) doesn't see JSX tag usage of a destructured param as
  // a reference, but does exempt capitalized top-level vars — same trick
  // SectionBits.jsx uses for its `Tag` element.
  const ItemComp = ItemC;
  const SepComp = SepC;
  const LabelComp = LabelC;
  const DangerComp = DangerC;

  if (selectMode) {
    return (
      <>
        <LabelComp>{selectedCount} selected</LabelComp>
        <ItemComp onClick={actions.bulkPin}>
          <Pin size={14} />
          Pin All
        </ItemComp>
        <ItemComp onClick={actions.bulkUnpin}>
          <Pin size={14} className="opacity-50" />
          Unpin All
        </ItemComp>
        <SepComp />
        <DangerComp onClick={actions.bulkDelete}>
          <Delete01 size={14} />
          Delete All
        </DangerComp>
      </>
    );
  }

  return (
    <>
      <ItemComp onClick={() => actions.togglePin(note.id)}>
        <Pin size={14} />
        {isPinned ? "Unpin Note" : "Pin Note"}
      </ItemComp>
      <ItemComp onClick={() => actions.rename(note.id)}>
        <Pen01 size={14} />
        Rename
      </ItemComp>
      <ItemComp onClick={() => actions.select(note.id)}>
        <CheckmarkSquare02 size={14} />
        Select
      </ItemComp>
      <SepComp />
      <DangerComp onClick={() => actions.delete(note.id)}>
        <Delete01 size={14} />
        Delete
      </DangerComp>
    </>
  );
}

/** One note in the grid. A `<div>` rather than a real `<button>` because
 * Menu.ContextTrigger wraps and clones props onto its child, and a
 * `<button>` nested inside interactive descendants (the "..." IconButton)
 * would be invalid HTML — same constraint DecisionCard documents. */
function NoteCard({ note, dateDisplay, previewText, projectName, isSelected, selectMode, isPinned, onActivate, actions }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onActivate();
    }
  };

  const activationLabel = selectMode
    ? `${isSelected ? "Deselect" : "Select"} ${note.title || "Untitled Note"}`
    : `Open ${note.title || "Untitled Note"}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={activationLabel}
      aria-pressed={selectMode ? isSelected : undefined}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative p-4 flex flex-col justify-between rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden",
        "min-h-[200px] backdrop-blur-xs",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        isSelected
          ? "bg-overlay border-border-strong ring-1 ring-overlay-strong"
          : "bg-overlay-subtle border-border-subtle hover:bg-overlay hover:border-border"
      )}
    >
      {/* Pinned indicator — white dot top-right */}
      {isPinned && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-pure z-dock" />
      )}

      {/* Header: Title (Consistent top spacing, no divider) */}
      <div className="z-sticky mb-5">
        <h3 className="text-sm font-medium font-sans leading-tight line-clamp-2 text-foreground transition-colors">
          {note.title || "Untitled Note"}
        </h3>
      </div>

      {/* Body: Preview (Taller) — line-clamp only, no gradient mask: a mask
          over clamped text clips mid-word, which read as a rendering bug. */}
      <div className="flex-1 relative overflow-hidden z-sticky mb-2">
        <p className="text-xs text-subtle-foreground leading-normal line-clamp-6">
          {previewText}
        </p>
      </div>

      {/* Footer: Date & Project Pill & Menu */}
      <div className="flex items-center justify-between mt-auto pt-3 z-sticky">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Date */}
          <span className="text-xs font-medium text-subtle-foreground uppercase tracking-wider shrink-0">
            {dateDisplay}
          </span>

          {/* Journal Pill */}
          {(note.tags || []).includes("journal") && (
            <span className="maia-tag whitespace-nowrap">journal</span>
          )}

          {/* Project Pill (Moved to Footer) */}
          {projectName && (
            <span className="text-xs text-subtle-foreground bg-overlay-subtle px-2 py-0.5 rounded-full border border-border-subtle whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-wider">
              {projectName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Menu.Root>
            <Menu.Trigger
              render={
                <IconButton
                  label="Note actions"
                  tooltip={false}
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-0.5 rounded-full bg-current" />
                    <div className="w-0.5 h-0.5 rounded-full bg-current" />
                    <div className="w-0.5 h-0.5 rounded-full bg-current" />
                  </div>
                </IconButton>
              }
            />
            <Menu.Content align="end">
              <Menu.Group>
                <NoteMenuBody
                  note={note}
                  selectMode={selectMode}
                  selectedCount={actions.selectedCount}
                  isPinned={isPinned}
                  actions={actions}
                  ItemC={Menu.Item}
                  SepC={Menu.Separator}
                  LabelC={Menu.Label}
                  DangerC={MenuDangerItem}
                />
              </Menu.Group>
            </Menu.Content>
          </Menu.Root>
        </div>
      </div>
    </div>
  );
}

/** Note card wrapped in the right-click / long-press context menu. */
function NoteCardMenu({ note, selectMode, selected, actions, ...cardProps }) {
  const longPress = useLongPress((touch) => {
    handleCardContextMenu({ preventDefault: () => {} });
    // Menu.ContextTrigger opens on its own gestures; long-press is surfaced
    // via native touch context menu support in the underlying primitive, so
    // nothing else is needed here besides keeping the touch handlers wired.
    void touch;
  });

  return (
    <Menu.Context>
      <Menu.ContextTrigger
        className="contents"
        onTouchStart={longPress.onTouchStart}
        onTouchMove={longPress.onTouchMove}
        onTouchEnd={longPress.onTouchEnd}
      >
        <NoteCard note={note} selectMode={selectMode} actions={actions} {...cardProps} />
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <NoteMenuBody
          note={note}
          selectMode={selectMode}
          selectedCount={selected}
          isPinned={cardProps.isPinned}
          actions={actions}
          ItemC={Menu.ContextItem}
          SepC={Menu.ContextSeparator}
          LabelC={Menu.ContextLabel}
          DangerC={ContextDangerItem}
        />
      </Menu.ContextContent>
    </Menu.Context>
  );
}

export default function NotesOverview({
  notes,
  selectNote,
  onDelete,
  onDeleteAll,
  onRename,
  onCreateNote,
  onCreateJournal,
  projects = [],
}) {
  const { generateSamples } = useData();

  // sort + filter UI state
  const [sort, setSort] = useState("recent"); // 'recent' | 'az'
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState("");

  // multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const toggleSelected = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Auto-exit selection mode if nothing is selected
      if (next.size === 0) {
        setSelectMode(false);
      }
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  // pinned IDs (persist locally)
  const [pinnedArr, setPinnedArr] = useState(() => {
    try {
      const raw = localStorage.getItem("maia.codex.pinned");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("maia.codex.pinned", JSON.stringify(pinnedArr));
    } catch { /* ignore */ }
  }, [pinnedArr]);

  const pinned = useMemo(() => new Set(pinnedArr), [pinnedArr]);

  // helpers
  const isPinned = useCallback((id) => pinned.has(id), [pinned]);

  // close on esc/select-mode/filter — the context and dropdown menus now
  // manage their own open/close/outside-click/focus via Base UI, so this
  // only needs to keep the filter + select-mode shortcuts alive.
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        if (selectMode) {
          e.preventDefault();
          exitSelectMode();
          return;
        }
        if (showFilter) {
          setShowFilter(false);
          setFilter("");
        }
      }
      if (e.key === "/") {
        e.preventDefault();
        setShowFilter(true);
      }
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [showFilter, selectMode, exitSelectMode]);

  // filter parsing
  const parsedFilter = useMemo(() => {
    const q = (filter || "").trim().toLowerCase();
    if (!q) return { q: "", tag: null, project: null };
    const tagMatch = q.match(/#([a-z0-9-_]+)/i);
    const projMatch = q.match(/project\s*:\s*([^#]+)/i);
    return {
      q,
      tag: tagMatch ? tagMatch[1].toLowerCase() : null,
      project: projMatch ? projMatch[1].trim().toLowerCase() : null,
    };
  }, [filter]);

  // apply filter + sort + pin ordering
  const viewNotes = useMemo(() => {
    let arr = [...notes];

    // filter
    if (parsedFilter.q) {
      arr = arr.filter((n) => {
        const title = (n.title || "").toLowerCase();
        const tags = (n.tags || []).map((t) => (t || "").toLowerCase());
        // Resolve project names from projectIds for filtering
        const noteProjectNames = (n.projectIds || []).map(pid => {
          const p = projects.find(proj => proj.id === pid);
          return p ? p.name.toLowerCase() : "";
        });

        const titleOk = title.includes(parsedFilter.q.replace(/#\w+|project\s*:[^#]+/gi, "").trim());
        const tagOk = parsedFilter.tag ? tags.includes(parsedFilter.tag) : true;
        const projOk = parsedFilter.project ? noteProjectNames.some(name => name === parsedFilter.project) : true;

        const onlySpecial =
          parsedFilter.q.replace(/#\w+|project\s*:[^#]+/gi, "").trim().length === 0;

        return (onlySpecial ? true : titleOk) && tagOk && projOk;
      });
    }

    // sort
    if (sort === "az") {
      arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
    } else {
      arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // pinned float to front
    const pinnedOnTop = [
      ...arr.filter((n) => isPinned(n.id)),
      ...arr.filter((n) => !isPinned(n.id)),
    ];
    return pinnedOnTop;
  }, [notes, sort, parsedFilter, isPinned]);

  // pin/unpin
  const togglePin = (id) => {
    setPinnedArr((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= PIN_LIMIT) {
        toast.warning(`You can pin up to ${PIN_LIMIT} notes.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  // state for custom delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Replaces the window.confirm / window.prompt calls this page used to make.
  const [confirm, setConfirm] = useState(null);
  const [renaming, setRenaming] = useState(null);

  const handleDeleteAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = () => {
    onDeleteAll?.();
    setShowDeleteConfirm(false);
  };

  // Bulk actions for multi-select
  const bulkDelete = () => {
    if (selected.size === 0) return;
    setConfirm({
      description: `Delete ${selected.size} note${selected.size > 1 ? 's' : ''}? This can't be undone.`,
      confirmLabel: "Delete",
      onConfirm: () => { selected.forEach(id => onDelete(id)); exitSelectMode(); },
    });
  };

  const bulkPin = () => {
    if (selected.size === 0) return;
    setPinnedArr(prev => {
      const next = [...prev];
      selected.forEach(id => {
        if (!next.includes(id) && next.length < PIN_LIMIT) {
          next.push(id);
        }
      });
      return next;
    });
    exitSelectMode();
  };

  const bulkUnpin = () => {
    if (selected.size === 0) return;
    setPinnedArr(prev => prev.filter(id => !selected.has(id)));
    exitSelectMode();
  };

  // Shared action set the note menu (both flavours) and card keyboard/click
  // handlers dispatch into.
  const menuActions = useMemo(() => ({
    togglePin,
    rename: (id) => {
      const curr = notes.find(x => x.id === id);
      setRenaming({ id, title: curr?.title || "" });
    },
    select: (id) => {
      setSelectMode(true);
      setSelected(new Set([id]));
    },
    delete: onDelete,
    bulkPin,
    bulkUnpin,
    bulkDelete,
    selectedCount: selected.size,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [notes, selected, onDelete]);

  return (
    <div
      className="h-full w-full relative bg-background text-foreground overflow-y-auto custom-scrollbar"
      onClick={(e) => {
        if (selectMode && e.target === e.currentTarget) {
          exitSelectMode();
        }
      }}
    >

      <div className="w-full px-page py-8 flex flex-col gap-8">

        {/* Header: Full Width, Opus Style */}
        <div className="sticky top-0 z-dock bg-background/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-border-subtle pt-2 gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">Codex</span>
            <span className="text-xs bg-overlay-subtle px-2 py-0.5 rounded-full text-muted-foreground">
              {viewNotes.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* New Note Button (Header) */}
            <Button size="sm" onClick={onCreateNote} title="Create New Note">
              <StickyNote03 size={14} className="stroke-[2.5px]" />
              <span className="text-xs font-bold uppercase tracking-wide">Note</span>
            </Button>

            {/* New Journal Button */}
            <Button variant="outline" size="sm" onClick={onCreateJournal} title="Create New Journal">
              <StickyNote03 size={14} className="stroke-[2.5px]" />
              <span className="text-xs font-bold uppercase tracking-wide">Journal</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSort(s => s === 'recent' ? 'az' : 'recent')}
              className="text-muted-foreground"
            >
              {sort === 'recent' ? 'RECENT' : 'A-Z'}
              <ProjectIcon name="filter" size={14} />
            </Button>

            {/* Settings Dropdown (Delete All, Seed) */}
            <Menu.Root>
              <Menu.Trigger
                render={
                  <IconButton
                    label="Codex settings"
                    tooltip={false}
                    variant="outline"
                    size="icon-sm"
                  >
                    <ProjectIcon name="settings" size={16} />
                  </IconButton>
                }
              />
              <Menu.Content align="end">
                <Menu.Group>
                  <Menu.Label className="text-xs font-bold uppercase tracking-widest">Actions</Menu.Label>
                  <Menu.Item
                    onClick={() => {
                      setConfirm({
                        title: "Replace all data?",
                        description: "This overwrites your current notes, projects and decisions with sample data.",
                        confirmLabel: "Replace",
                        onConfirm: generateSamples,
                      });
                    }}
                    className="text-success"
                  >
                    <Sparkles size={14} />
                    Seed Data
                  </Menu.Item>

                  {notes.length > 0 && (
                    <>
                      <Menu.Separator />
                      <MenuDangerItem onClick={handleDeleteAll}>
                        <Delete01 size={14} />
                        Delete All
                      </MenuDangerItem>
                    </>
                  )}
                </Menu.Group>
              </Menu.Content>
            </Menu.Root>
          </div>

        </div>

        <PageTitle>All notes</PageTitle>
      </div>

      {/* Grid Container */}
      <div
        className="flex-1 min-h-0 px-page"
        onClick={(e) => {
          if (selectMode && e.target === e.currentTarget) exitSelectMode();
        }}
      >
        <div
          className="grid gap-4 pb-24"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          onClick={(e) => {
            if (selectMode && e.target === e.currentTarget) exitSelectMode();
          }}
        >

          {viewNotes.map(n => {
            // Smart Date Logic
            const d = new Date(n.createdAt);
            const now = new Date();
            const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            const isYesterday = d.getDate() === now.getDate() - 1 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

            let dateDisplay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (isToday) dateDisplay = "TODAY";
            if (isYesterday) dateDisplay = "YESTERDAY";

            // Preview Logic
            const previewText = n.content && n.content.trim().length > 0 ? n.content : "No additional text...";

            const isSelected = selectMode && selected.has(n.id);

            const linkedProject = (n.projectIds || []).length > 0
              ? projects.find(p => p.id === n.projectIds[0])
              : null;

            const onActivate = () => {
              if (selectMode) {
                toggleSelected(n.id);
              } else {
                selectNote?.(n.id);
              }
            };

            return (
              <NoteCardMenu
                key={n.id}
                note={n}
                dateDisplay={dateDisplay}
                previewText={previewText}
                projectName={linkedProject?.name}
                isSelected={isSelected}
                selectMode={selectMode}
                selected={selected.size}
                isPinned={isPinned(n.id)}
                onActivate={onActivate}
                actions={menuActions}
              />
            );
          })}

          {/* Empty State */}
          {viewNotes.length === 0 && (
            <EmptyState
              size="page"
              icon={StickyNote03}
              title="No notes found"
              className="col-span-full"
            />
          )}

        </div>
      </div>

      {/* All confirmations and the rename prompt now share one component
          each, instead of a bespoke modal plus three native browser dialogs. */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAll}
        title="Delete all notes?"
        description={`This can't be undone. All ${notes.length} notes will be permanently removed.`}
        confirmLabel="Delete all"
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm()}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel || "Delete"}
      />

      <PromptDialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        onSubmit={(title) => onRename(renaming.id, title)}
        title="Rename note"
        label="Title"
        initialValue={renaming?.title || ""}
        submitLabel="Rename"
      />

    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/arc/button/button";
import { SearchField } from "@/components/arc/search-field/search-field";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { PageHeader, PageTitle } from "@/components/composed/PageHeader";
import { CountPill } from "@/components/composed/SectionBits";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { EmptyState } from "@/components/composed/EmptyState";
import { StickyNote03, Delete01, AiMagic as Sparkles } from "../components/ui/CustomIcon.jsx";
import { NoteCardMenu } from "../features/Notes/components/NoteCard.jsx";
import { useData } from "../context/DataContext";
import styles from "./NotesPage.module.css";

const PIN_LIMIT = 16;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", else "Sep 24". Compares calendar days, not 24h spans. */
const formatNoteDate = (iso) => {
  const d = new Date(iso);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// "/" opens the filter, but never while the user is typing somewhere.
const isTypingTarget = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

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

  // Escape leaves select mode / closes the filter. The menus manage their own
  // open/close/focus via Base UI.
  useEffect(() => {
    const onKey = (e) => {
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
        return;
      }
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setShowFilter(true);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
    return [
      ...arr.filter((n) => isPinned(n.id)),
      ...arr.filter((n) => !isPinned(n.id)),
    ];
  }, [notes, sort, parsedFilter, isPinned, projects]);

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

  const exitOnBlankClick = (e) => {
    if (selectMode && e.target === e.currentTarget) exitSelectMode();
  };

  const hasNotes = notes.length > 0;

  return (
    <div className={styles.page} onClick={exitOnBlankClick}>
      <div className={styles.inner} onClick={exitOnBlankClick}>
        <PageHeader
          actions={
            <>
              {selectMode && (
                <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                  Cancel selection
                </Button>
              )}
              <Button size="sm" onClick={onCreateNote}>
                <StickyNote03 size={16} aria-hidden="true" />
                New note
              </Button>
              <Button variant="secondary" size="sm" onClick={onCreateJournal}>
                <StickyNote03 size={16} aria-hidden="true" />
                New journal
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSort(s => s === 'recent' ? 'az' : 'recent')}
              >
                <ArrowUpDown size={16} strokeWidth={1.75} aria-hidden="true" />
                {sort === 'recent' ? 'Sort: recent' : 'Sort: A to Z'}
              </Button>

              {/* Settings dropdown (delete all, sample data) */}
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <IconButton
                      label="Codex settings"
                      tooltip={false}
                      icon={Settings}
                      variant="outline"
                      size="icon-sm"
                    />
                  }
                />
                <Menu.Content align="end">
                  <Menu.Group>
                    <Menu.Label>Actions</Menu.Label>
                    <Menu.Item
                      onClick={() => {
                        setConfirm({
                          title: "Replace all data?",
                          description: "This overwrites your current notes, projects and decisions with sample data.",
                          confirmLabel: "Replace",
                          onConfirm: generateSamples,
                        });
                      }}
                    >
                      <Sparkles size={16} />
                      Load sample data
                    </Menu.Item>

                    {hasNotes && (
                      <>
                        <Menu.Separator />
                        <MenuDangerItem onClick={() => setShowDeleteConfirm(true)}>
                          <Delete01 size={16} />
                          Delete all notes
                        </MenuDangerItem>
                      </>
                    )}
                  </Menu.Group>
                </Menu.Content>
              </Menu.Root>
            </>
          }
        >
          <div className={styles.headerLead}>
            <PageTitle>All notes</PageTitle>
            <CountPill>{viewNotes.length}</CountPill>
          </div>
        </PageHeader>

        {showFilter && (
          <div className={styles.filter}>
            <SearchField
              label="Filter notes"
              placeholder="Title, #tag or project:name"
              value={filter}
              onValueChange={setFilter}
              autoFocus
            />
          </div>
        )}

        <div className={styles.grid} onClick={exitOnBlankClick}>
          {viewNotes.map(n => {
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
                dateDisplay={formatNoteDate(n.createdAt)}
                previewText={n.content && n.content.trim().length > 0 ? n.content : "No text yet."}
                projectName={linkedProject?.name}
                isSelected={selectMode && selected.has(n.id)}
                selectMode={selectMode}
                selected={selected.size}
                isPinned={isPinned(n.id)}
                onActivate={onActivate}
                actions={menuActions}
              />
            );
          })}

          {viewNotes.length === 0 && (
            <EmptyState
              size="page"
              icon={StickyNote03}
              className={styles.empty}
              title={hasNotes ? "No notes match this filter" : "No notes yet"}
              description={hasNotes
                ? "Try a different title, tag or project."
                : "Notes you write show up here as cards."}
              action={hasNotes
                ? <Button variant="secondary" onClick={() => setFilter("")}>Clear filter</Button>
                : <Button onClick={onCreateNote}>Create a note</Button>}
            />
          )}
        </div>
      </div>

      {/* All confirmations and the rename prompt share one component each. */}
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

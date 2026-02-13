import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProjectIcon from "../components/ProjectIcon";
import { useData } from "../context/DataContext";
import { Plus, Settings, Trash2, Sparkles, ListFilter } from "lucide-react";

/**
 * NotesOverview (Codex)
 * - Refined Aesthetic (Opus Match)
 * - Darker, Prettier Pills
 */

const PIN_LIMIT = 16;

export default function NotesOverview({
  notes,
  selectNote,
  onDelete,
  onDeleteAll,
  onRename,
  onCreateNote,
  projects = [],
}) {
  const { generateSamples } = useData();

  const menuRef = useRef(null);
  const filterRef = useRef(null);

  // context menu state
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, id: null, sub: false });

  // sort + filter UI state
  const [sort, setSort] = useState("recent"); // 'recent' | 'az'
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState("");

  // settings menu
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // close settings on click outside
  useEffect(() => {
    const onClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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

  // open context menu at cursor
  const openMenu = (e, id) => {
    e.preventDefault();

    // We need global coordinates since the menu is fixed
    const x = e.clientX;
    const y = e.clientY;

    setMenu({ open: true, x, y, id, sub: false });
  };

  // close menu on outside/esc/scroll/resize
  useEffect(() => {
    const onDown = (e) => {
      const el = menuRef.current;
      if (el && (el === e.target || el.contains(e.target))) return;
      setMenu((m) => ({ ...m, open: false, sub: false }));
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        if (showFilter) {
          setShowFilter(false);
          setFilter("");
        }
        setMenu((m) => ({ ...m, open: false, sub: false }));
      }
      if (e.key === "/") {
        e.preventDefault();
        setShowFilter(true);
        setTimeout(() => filterRef.current?.focus(), 0);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showFilter]);

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
        window.alert(`You can pin up to ${PIN_LIMIT} notes.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  // state for custom delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = () => {
    onDeleteAll?.();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="h-full w-full relative bg-black font-mono text-zinc-200 overflow-y-auto custom-scrollbar">

      <div className="w-full px-6 md:px-8 py-8 flex flex-col gap-8">

        {/* Header: Full Width, Opus Style */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-white/5 pt-2">
          <div className="flex items-center gap-4">
            <span className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Codex</span>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-500 font-mono">
              {viewNotes.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* New Note Button (Header) */}
            <button
              onClick={onCreateNote}
              className="h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
              title="Create New Note"
            >
              <Plus size={14} strokeWidth={3} />
              <span className="text-xs font-bold uppercase tracking-wide">New</span>
            </button>




            <button
              onClick={() => setSort(s => s === 'recent' ? 'az' : 'recent')}
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 font-mono transition-colors flex items-center gap-2"
            >
              {sort === 'recent' ? 'RECENT' : 'A-Z'}
              <ListFilter size={14} />
            </button>

            {/* Settings Dropdown (Delete All, Seed) */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors border ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
              >
                <Settings size={16} />
              </button>

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-600 font-bold border-b border-white/5 mb-1">
                    Actions
                  </div>
                  {/* Seed Data */}
                  <button
                    onClick={() => {
                      if (window.confirm("Replace all data with sample data?")) {
                        generateSamples();
                      }
                      setShowSettings(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-emerald-400 group transition-colors"
                  >
                    <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-mono">Seed Data</span>
                  </button>

                  {/* Delete All */}
                  {notes.length > 0 && (
                    <button
                      onClick={() => { handleDeleteAll(); setShowSettings(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-red-400 group transition-colors"
                    >
                      <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-mono">Delete All</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-24">

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
            const hasContent = n.content && n.content.trim().length > 0;
            const previewText = hasContent ? n.content : "No additional text...";
            const isShort = !hasContent;

            return (
              <div
                key={n.id}
                onClick={() => selectNote?.(n.id)}
                onContextMenu={e => openMenu(e, n.id)}
                className={`
                    group relative p-5 flex flex-col justify-between rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                    ${isShort ? "h-40" : "h-64"}
                    ${isPinned(n.id)
                    ? "bg-[#121214] border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]"
                    : "bg-black border-white/10 hover:border-white/20 hover:bg-[#09090b] hover:shadow-2xl"
                  }
                  `}
              >
                {/* Header: Title (Consistent top spacing, no divider) */}
                <div className="z-10 mb-5">
                  <h3 className={`text-lg font-bold font-sans leading-tight line-clamp-2 ${isPinned(n.id) ? "text-white" : "text-zinc-200 group-hover:text-white transition-colors"}`}>
                    {n.title || "Untitled Note"}
                  </h3>
                </div>

                {/* Body: Preview (Taller) */}
                <div className="flex-1 relative overflow-hidden z-10 mb-2">
                  <p className={`text-[10px] font-mono text-zinc-500 leading-relaxed opacity-80 ${isShort ? "line-clamp-4" : "line-clamp-[8]"}`}>
                    {previewText}
                  </p>

                  {/* Fade out mask - Layer 1 (Default: Black or Pinned Color) - Always visible */}
                  <div className={`absolute bottom-0 left-0 w-full h-8 pointer-events-none bg-gradient-to-t to-transparent
                        ${isPinned(n.id) ? "from-[#121214] via-[#121214]/80" : "from-black via-black/80"}
                    `} />

                  {/* Fade out mask - Layer 2 (Hover Gray) - Only for unpinned */}
                  {!isPinned(n.id) && (
                    <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
                  )}
                </div>

                {/* Footer: Date & Project Pill & Menu */}
                <div className="flex items-center justify-between mt-auto pt-3 z-10">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Date */}
                    <span className="text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-wider flex-shrink-0">
                      {dateDisplay}
                    </span>

                    {/* Project Pill (Moved to Footer) */}
                    {(n.projectIds || []).length > 0 && (() => {
                      const linkedProject = projects.find(p => p.id === n.projectIds[0]);
                      return linkedProject ? (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap overflow-hidden text-ellipsis">
                          {linkedProject.name}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isPinned(n.id) && <ProjectIcon name="star" size={10} className="text-emerald-500" />}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        // Open menu at button position
                        setMenu({ open: true, x: rect.left, y: rect.bottom + 5, id: n.id, sub: false });
                      }}
                      className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-0.5 rounded-full bg-current" />
                        <div className="w-0.5 h-0.5 rounded-full bg-current" />
                        <div className="w-0.5 h-0.5 rounded-full bg-current" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {viewNotes.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-600 opacity-50 select-none">
              <ProjectIcon name="layers" size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-light uppercase tracking-widest">No notes found</p>
            </div>
          )}

        </div>
      </div>

      {/* Context Menu */}
      {
        menu.open && (
          <div
            ref={menuRef}
            className="fixed z-[100] min-w-[180px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                togglePin(menu.id);
                setMenu(m => ({ ...m, open: false }));
              }}
            >
              <ProjectIcon name={isPinned(menu.id) ? "trash" : "star"} size={14} />
              <span>{isPinned(menu.id) ? "Unpin Note" : "Pin Note"}</span>
            </button>

            <button
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                const curr = notes.find(x => x.id === menu.id);
                const title = window.prompt("Rename note", curr?.title || "");
                if (title != null) onRename(menu.id, title.trim());
                setMenu(m => ({ ...m, open: false }));
              }}
            >
              <ProjectIcon name="quill" size={14} />
              Rename
            </button>

            <div className="h-px bg-white/10 my-1" />

            <button
              className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                if (window.confirm("Delete this note?")) onDelete(menu.id);
                setMenu(m => ({ ...m, open: false }));
              }}
            >
              <ProjectIcon name="trash" size={14} />
              Delete
            </button>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-white mb-2">Delete All Notes?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                This action cannot be undone. All {notes.length} notes will be permanently removed.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAll}
                  className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}

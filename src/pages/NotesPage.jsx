// src/pages/NotesPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlassSurface from "../components/GlassSurface";
import ProjectIcon from "../components/ProjectIcon";

/**
 * NotesOverview (Codex)
 * - Glass aesthetic
 * - Watermark (Bottom-Left)
 * - Premium Note Cards
 * - Auto-height container
 */

const PIN_LIMIT = 16;

export default function NotesOverview({
  notes,
  selectNote,
  onDelete,
  onRename,
  onCreateNote,
}) {
  const menuRef = useRef(null);
  const filterRef = useRef(null);

  // context menu state
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, id: null, sub: false });

  // sort + filter UI state
  const [sort, setSort] = useState("recent"); // 'recent' | 'az'
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState("");

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
        const proj = (n.project || "").toLowerCase();

        const titleOk = title.includes(parsedFilter.q.replace(/#\w+|project\s*:[^#]+/gi, "").trim());
        const tagOk = parsedFilter.tag ? tags.includes(parsedFilter.tag) : true;
        const projOk = parsedFilter.project ? proj === parsedFilter.project : true;

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

  return (
    <div className="h-full w-full relative bg-black font-sans text-zinc-200 overflow-hidden">

      {/* "Codex" Watermark: Bottom Left */}
      <div className="absolute bottom-[-1rem] left-[-0.5rem] text-[12rem] md:text-[16rem] leading-none font-bold text-white opacity-[0.34] select-none pointer-events-none z-0 tracking-tighter">
        Codex
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 z-10 overflow-y-auto custom-scrollbar p-6 md:p-8">
        <div className="w-full min-h-min flex flex-col pointer-events-none">
          <GlassSurface className="pointer-events-auto flex flex-col !h-auto w-full shrink-0">

            {/* Header: Right Aligned Controls Only */}
            <div className="flex-none p-6 border-b border-white/5 flex items-center justify-end">
              <div className="flex items-center gap-2">
                {/* Note Count */}
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-xs text-zinc-500 font-mono mr-2">
                  {viewNotes.length}
                </span>

                {/* Sort Toggle */}
                <button
                  onClick={() => setSort(s => s === 'recent' ? 'az' : 'recent')}
                  className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 font-mono transition-colors flex items-center gap-2"
                >
                  {sort === 'recent' ? 'Recent' : 'A-Z'}
                  <ProjectIcon name="layers" size={14} />
                </button>

                {/* Filter */}
                <div className={`
                    h-8 flex items-center rounded-lg border transition-all duration-300 overflow-hidden
                    ${showFilter ? 'w-48 bg-white/10 border-white/20' : 'w-8 bg-white/5 border-white/5 hover:bg-white/10'}
                `}>
                  <button
                    onClick={() => {
                      setShowFilter(true);
                      setTimeout(() => filterRef.current?.focus(), 10);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white flex-shrink-0"
                  >
                    <ProjectIcon name="research" size={16} />
                  </button>
                  {showFilter && (
                    <input
                      ref={filterRef}
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      onBlur={() => !filter && setShowFilter(false)}
                      className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-500 pr-3 font-mono"
                      placeholder="Filter..."
                    />
                  )}
                </div>

                {/* Add Button */}
                <button
                  onClick={onCreateNote}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  <span className="text-lg leading-none mb-0.5">+</span>
                </button>
              </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

                {viewNotes.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 opacity-50">
                    <ProjectIcon name="writing" size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-light">The archive is empty.</p>
                  </div>
                )}

                {viewNotes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => selectNote?.(n.id)}
                    onContextMenu={e => openMenu(e, n.id)}
                    className={`
                        group relative h-40 p-5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300
                        hover:scale-[1.02] hover:-translate-y-1
                        ${isPinned(n.id)
                        ? "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-xl"
                      }
                    `}
                  >
                    <div className="space-y-2">
                      <h3 className={`font-medium line-clamp-2 leading-tight ${isPinned(n.id) ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                        {n.title || "Untitled Note"}
                      </h3>
                      <div className="text-[10px] text-zinc-500 font-mono line-clamp-3 leading-relaxed opacity-70 group-hover:opacity-100">
                        {n.preview || "No content"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                      {isPinned(n.id) && (
                        <ProjectIcon name="star" size={12} className="text-amber-300" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </GlassSurface>
        </div>
      </div>

      {/* Context Menu */}
      {menu.open && (
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
      )}

    </div>
  );
}

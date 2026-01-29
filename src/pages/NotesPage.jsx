// src/components/NotesOverview.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * NotesOverview (Codex)
 * - Back to Aether (Home) + title "Codex"
 * - Right side: "<count> notes | Sort Recent · A–Z · Filter"
 * - Filter bar (toggle with / or button). Filters: title substring, #tag, project:Name
 * - Chips row with:
 *    • title • date • #firstTag
 *    • outline circle if empty note
 *    • filled white circle + white border if pinned
 *    • perfectly centered tag chip (inline-flex, fixed height)
 * - "+” chip at the end (white border, same bg as pills)
 * - Pin/Unpin from context menu (limit 16), Rename, Delete, Move to project
 */

const PIN_LIMIT = 16;

export default function NotesOverview({
  notes,
  selectNote,
  onDelete,
  onRename,
  onMove,
  projects,
  onCreateNote, // required to make the + chip work
  onBack,       // required to go back to Aether
}) {
  const containerRef = useRef(null);
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
    } catch { }
  }, [pinnedArr]);
  const pinned = useMemo(() => new Set(pinnedArr), [pinnedArr]);

  // helpers
  const isEmpty = (n) => !(n?.content && n.content.trim().length > 0);
  const isPinned = (id) => pinned.has(id);
  const firstTag = (n) => (Array.isArray(n.tags) && n.tags.length ? n.tags[0] : null);

  // open context menu at cursor (relative to scroller)
  const openMenu = (e, id) => {
    e.preventDefault();
    const wrap = containerRef.current;
    const rect = wrap?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left + wrap.scrollLeft : e.clientX;
    const y = rect ? e.clientY - rect.top + wrap.scrollTop : e.clientY;
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
        } else {
          onBack?.();
        }
        setMenu((m) => ({ ...m, open: false, sub: false }));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onCreateNote?.();
      }
      if (e.key === "/") {
        e.preventDefault();
        setShowFilter(true);
        setTimeout(() => filterRef.current?.focus(), 0);
      }
    };
    const onScrollOrResize = () => setMenu((m) => ({ ...m, open: false, sub: false }));

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", onScrollOrResize);
    containerRef.current?.addEventListener("scroll", onScrollOrResize, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", onScrollOrResize);
      containerRef.current?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [onBack, onCreateNote, showFilter]);

  // filter parsing: supports "#tag" and "project:Name"
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

        // If q is only a tag or project, allow empty titleOk
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

    // pinned float to front (keep original relative order within pinned/unpinned)
    const pinnedOnTop = [
      ...arr.filter((n) => isPinned(n.id)),
      ...arr.filter((n) => !isPinned(n.id)),
    ];
    return pinnedOnTop;
  }, [notes, sort, parsedFilter, pinned]);

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

  // context menu helpers
  const pickProject = (name) => {
    onMove(menu.id, name);
    setMenu((m) => ({ ...m, open: false, sub: false }));
  };
  const askNewProject = () => {
    const name = window.prompt("New project name?");
    if (!name) return;
    onMove(menu.id, name.trim());
    setMenu((m) => ({ ...m, open: false, sub: false }));
  };



  return (
    <div className="h-full w-full flex flex-col p-6 md:p-12 overflow-hidden relative">
      {/* Background: Pitch Black */}
      <div className="absolute inset-0 bg-black pointer-events-none" />

      {/* Header */}
      <header className="flex-none w-full mb-8 z-10 flex items-center justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-zinc-500 hover:text-white transition-colors text-xl"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-mono text-white font-bold tracking-tight">Codex</h1>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span>{viewNotes.length} notes</span>
          <span className="text-zinc-800">|</span>
          <span>Sort</span>
          <button
            onClick={() => setSort('recent')}
            className={`hover:text-zinc-300 transition-colors ${sort === 'recent' ? 'text-zinc-300' : ''}`}
          >
            Recent
          </button>
          <span>·</span>
          <button
            onClick={() => setSort('az')}
            className={`hover:text-zinc-300 transition-colors ${sort === 'az' ? 'text-zinc-300' : ''}`}
          >
            A-Z
          </button>
          <span>·</span>
          {showFilter ? (
            <div className="relative flex items-center">
              <input
                ref={filterRef}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="bg-transparent border-b border-zinc-700 text-zinc-300 outline-none w-24 py-0.5 focus:border-zinc-500 text-xs"
                autoFocus
              />
              <button
                onClick={() => { setShowFilter(false); setFilter(""); }}
                className="ml-2 hover:text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowFilter(true); setTimeout(() => filterRef.current?.focus(), 10); }}
              className="hover:text-zinc-300 transition-colors"
            >
              Filter
            </button>
          )}
        </div>
      </header>

      {/* Content: Pills Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="flex flex-wrap gap-2 content-start pb-20">
          {viewNotes.length === 0 && (
            <div className="w-full flex flex-col items-center justify-center h-64 text-center opacity-40">
              <span className="text-5xl mb-4 grayscale">📭</span>
              <span className="text-sm text-zinc-500 font-mono">No notes found.</span>
            </div>
          )}

          {viewNotes.map(n => (
            <button
              key={n.id}
              onClick={() => selectNote?.(n.id)}
              onContextMenu={e => openMenu(e, n.id)}
              className={`
                h-9 px-4 rounded-full border flex items-center gap-3 transition-all text-sm font-mono
                ${isPinned(n.id)
                  ? "bg-white/10 border-white/30 text-white shadow-lg shadow-white/5"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-300 hover:border-white/20"
                }
              `}
            >
              <span className="truncate max-w-[200px]">{n.title || "Untitled"}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
              {isPinned(n.id) && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ml-1" />
              )}
            </button>
          ))}

          {/* New Note Button */}
          <button
            onClick={onCreateNote}
            className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white hover:bg-white/5 transition-all hover:scale-105"
          >
            +
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {menu.open && (
        <div
          ref={menuRef}
          className="glass-panel fixed z-[100] min-w-[200px] rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 border border-white/10 bg-black/80 backdrop-blur-xl"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(menu.id);
              setMenu((m) => ({ ...m, open: false, sub: false }));
            }}
          >
            <span>{isPinned(menu.id) ? "Unpin Note" : "Pin Note"}</span>
          </button>

          <button
            className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const curr = notes.find((x) => x.id === menu.id);
              const title = window.prompt("Rename note", curr?.title || "");
              if (title != null) onRename(menu.id, title.trim());
              setMenu((m) => ({ ...m, open: false, sub: false }));
            }}
          >
            Rename
          </button>

          <button
            className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm("Delete this note?")) onDelete(menu.id);
              setMenu((m) => ({ ...m, open: false, sub: false }));
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

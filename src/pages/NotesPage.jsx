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
    <div className="h-full w-full flex items-center justify-center p-4 md:p-8">
      {/* Main Container */}
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-5xl h-full max-h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex-none px-6 pt-6 pb-4 border-b border-white/5 bg-black/20 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                ←
              </button>
            )}
            <div>
              <h1 className="text-xl font-medium text-white tracking-wide">Codex</h1>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                {viewNotes.length} Notes · {sort === 'recent' ? 'Recent' : 'A-Z'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <input
                ref={filterRef}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter..."
                className="bg-black/40 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/20 hover:border-white/20 transition-colors w-40 focus:w-64 transition-all duration-300"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">/</span>
            </div>
            <button
              onClick={onCreateNote}
              className="h-8 px-4 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
            >
              New Note
            </button>
          </div>
        </div>

        {/* Chips / Pills Row (if needed, simplified) */}
        {/* pinned or active filters could go here */}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar relative">
          {viewNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
              <span className="text-4xl mb-4">📭</span>
              <span className="text-sm text-zinc-500">No notes found.</span>
            </div>
          )}

          {viewNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNote?.(n.id)}
              onContextMenu={(e) => openMenu(e, n.id)}
              className="group w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 hover:bg-white/5 hover:scale-[1.005] border border-transparent hover:border-white/5 relative"
            >
              {/* Icon/Pin */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isPinned(n.id) ? "bg-white text-black" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"}`}>
                {isPinned(n.id) ? "★" : "📄"}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium truncate ${isPinned(n.id) ? "text-white" : "text-zinc-300 group-hover:text-white transition-colors"}`}>
                    {n.title || "Untitled Note"}
                  </span>
                  {firstTag(n) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      #{firstTag(n)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  {n.project && (
                    <>
                      <span>·</span>
                      <span className="text-zinc-400">{n.project}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Arrow on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 -translate-x-2 group-hover:translate-x-0 duration-200">
                →
              </div>
            </button>
          ))}
        </div>

        {/* Context menu */}
        {menu.open && (
          <div
            ref={menuRef}
            className="glass-panel fixed z-[100] min-w-[200px] rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Pin / Unpin */}
            <button
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePin(menu.id);
                setMenu((m) => ({ ...m, open: false, sub: false }));
              }}
            >
              <span>{isPinned(menu.id) ? "Unpin" : "Pin Note"}</span>
            </button>

            {/* Rename */}
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

            {/* Delete */}
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
    </div>
  );
}

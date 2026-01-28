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
    } catch {}
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
    <div ref={containerRef} className="h-full overflow-auto relative">
      {/* Header */}
      <div
        className={`px-4 pt-3 pb-3 flex items-center justify-between ${
          showFilter ? "border-b border-zinc-900/60" : "border-b border-transparent"
        }`}
      >
        {/* left: back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack?.()}
            className="text-zinc-400 hover:text-zinc-100"
            title="Back to Aether"
          >
            ←
          </button>
          <div className="text-lg font-semibold text-zinc-100">Codex</div>
        </div>

        {/* right: count | sort + filter */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{viewNotes.length} notes</span>
          <span aria-hidden className="inline-block w-px h-3 bg-zinc-800" />

          <span className="hidden sm:inline">Sort</span>
          <button
            onClick={() => setSort("recent")}
            className={sort === "recent" ? "text-zinc-100" : "hover:text-zinc-300"}
          >
            Recent
          </button>
          <span className="text-zinc-700">·</span>
          <button
            onClick={() => setSort("az")}
            className={sort === "az" ? "text-zinc-100" : "hover:text-zinc-300"}
          >
            A–Z
          </button>

          <span className="mx-1 text-zinc-700">·</span>

          <button
            onClick={() => {
              setShowFilter((v) => !v);
              setTimeout(() => filterRef.current?.focus(), 0);
            }}
            className="hover:text-zinc-300"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilter && (
        <div className="px-4 py-2 border-b border-zinc-900/60 bg-black/40">
          <input
            ref={filterRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter notes…  (title,  #tag,  project: Name)"
            className="w-full bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
      )}

      {/* Chips row */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex flex-wrap gap-2">
          {viewNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNote?.(n.id)}
              onContextMenu={(e) => openMenu(e, n.id)}
              title="Right-click for actions"
              className={[
                "group h-9 px-3 inline-flex items-center gap-2 rounded-full",
                "bg-zinc-950/70",
                isPinned(n.id) ? "border border-white" : "border border-zinc-800/80",
                "hover:bg-zinc-900/70 hover:border-zinc-700",
                "focus:outline-none focus:ring-1 focus:ring-zinc-600",
                "whitespace-nowrap",
              ].join(" ")}
            >
              {/* title */}
              <span className="text-sm text-zinc-100 truncate max-w-[46ch]">
                {n.title || "Untitled"}
              </span>

              {/* dot */}
              <span className="text-zinc-600">•</span>

              {/* date */}
              <span className="text-[11px] text-zinc-500">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>

              {/* first tag */}
              {firstTag(n) && (
                <span
                  className="ml-1 inline-flex items-center justify-center h-[18px] px-2 rounded-full
                             border border-emerald-700/30 bg-emerald-900/20 text-emerald-300
                             text-[10px] leading-none"
                >
                  #{firstTag(n)}
                </span>
              )}

              {/* empty / pinned indicators */}
              {isEmpty(n) && (
                <span className="ml-1 inline-flex w-3.5 h-3.5 rounded-full border border-zinc-600" />
              )}
              {isPinned(n.id) && (
                <span className="ml-1 inline-flex w-3.5 h-3.5 rounded-full bg-white border border-white" />
              )}
            </button>
          ))}

          {/* + chip */}
          <button
            onClick={() => onCreateNote?.()}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full
                       bg-zinc-950/70 border border-white text-white
                       hover:bg-zinc-900/70 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            title="New note (N / Cmd/Ctrl+N)"
          >
            +
          </button>
        </div>
      </div>

      {/* Context menu */}
      {menu.open && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-zinc-950 border border-zinc-800 text-sm shadow-lg min-w-[200px]"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Pin / Unpin */}
          <button
            className="w-full text-left px-3 py-2 hover:bg-zinc-900"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(menu.id);
              setMenu((m) => ({ ...m, open: false, sub: false }));
            }}
          >
            {isPinned(menu.id) ? "Unpin" : "Pin"}
          </button>

          {/* Rename */}
          <button
            className="w-full text-left px-3 py-2 hover:bg-zinc-900"
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
            className="w-full text-left px-3 py-2 hover:bg-zinc-900 text-red-300"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm("Delete this note?")) onDelete(menu.id);
              setMenu((m) => ({ ...m, open: false, sub: false }));
            }}
          >
            Delete
          </button>

          {/* Move to project (submenu) */}
          <div className="relative">
            <button
              className="w-full text-left px-3 py-2 hover:bg-zinc-900"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenu((m) => ({ ...m, sub: !m.sub }));
              }}
            >
              Move to project ▸
            </button>

            {menu.sub && (
              <div
                className="absolute left-full top-0 bg-zinc-950 border border-zinc-800 min-w-[220px] z-50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {(!projects || projects.length === 0) && (
                  <div className="px-3 py-2 text-zinc-500">No projects</div>
                )}
                {(projects || []).map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-900"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pickProject(p.name);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                <div className="border-t border-zinc-800" />
                <button
                  className="w-full text-left px-3 py-2 hover:bg-zinc-900"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    askNewProject();
                  }}
                >
                  New project…
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-zinc-900"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    pickProject(null);
                  }}
                >
                  Remove from project
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

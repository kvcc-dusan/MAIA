// @maia:command-palette
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CommandPalette({
  open,
  onClose,
  notes = [],
  onOpenNote,        // (id) => void
  onCreateNote,      // () => void
  go,                // (pageId) => void  e.g. "overview" | "projects" | "canvas" | "graph" | "pulse"
  quickAddTask,      // (title) => void
  quickAddReminder,  // (title) => void
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); items[i]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i]); // eslint-disable-line

  const text = (s) => (s || "").toLowerCase();
  const score = (title) => text(title).includes(text(q)) ? (q ? 1 : 0.5) : 0;

  const actions = [
    { label: "New note", run: () => { onClose(); onCreateNote?.(); } },
    { label: "New task…", run: () => { onClose(); const t = prompt("Task title?"); if (t) quickAddTask?.(t); } },
    { label: "New reminder…", run: () => { onClose(); const t = prompt("Reminder title?"); if (t) quickAddReminder?.(t); } },
    { label: "Go: Notes", run: () => { onClose(); go?.("overview"); } },
    { label: "Go: Projects", run: () => { onClose(); go?.("projects"); } },
    { label: "Go: Canvas", run: () => { onClose(); go?.("canvas"); } },
    { label: "Go: Graph", run: () => { onClose(); go?.("graph"); } },
    { label: "Go: Pulse", run: () => { onClose(); go?.("pulse"); } },
  ].map(a => ({ ...a, _type: "action" }));

  const noteItems = notes
    .map(n => ({ _type: "note", label: n.title || "Untitled", noteId: n.id, run: () => { onClose(); onOpenNote?.(n.id); } }))
    .filter(n => score(n.label));

  const items = useMemo(() => {
    const act = actions.filter(a => score(a.label));
    const list = [...act, ...noteItems].sort((a, b) => score(b.label) - score(a.label));
    return list.slice(0, 12);
  }, [q, notes]); // eslint-disable-line

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/60" onMouseDown={onClose}>
      <div className="mx-auto mt-20 w-[680px] rounded-xl border border-zinc-800 bg-zinc-950" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="p-3 border-b border-zinc-800">
          <input
            ref={inputRef}
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Type a command or search notes…"
            className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div className="max-h-[420px] overflow-auto p-1">
          {items.length === 0 && (
            <div className="px-3 py-3 text-sm text-zinc-500">No matches.</div>
          )}
          {items.map((it, idx) => (
            <button
              key={idx}
              onMouseEnter={()=>setI(idx)}
              onClick={()=>it.run()}
              className={`w-full text-left px-3 py-2 text-sm ${
                i===idx ? "bg-zinc-900 text-zinc-100" : "text-zinc-300"
              }`}
            >
              <span className="mr-2 text-xs uppercase tracking-wider text-zinc-500">{it._type}</span>
              {it.label}
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-zinc-800 text-xs text-zinc-500">
          ⌘K / Ctrl-K to open, ↑/↓ to navigate, Enter to run, Esc to close
        </div>
      </div>
    </div>
  );
}

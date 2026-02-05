// @maia:command-palette
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function CommandPalette({
  open,
  onClose,
  notes = [],
  onOpenNote,        // (id) => void
  onCreateNote,      // () => void
  onCreateProject,   // () => void
  go,                // (pageId) => void
  onOpenCronos,      // () => void
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef(null);

  const text = (s) => (s || "").toLowerCase();
  const score = (title) => text(title).includes(text(q)) ? (q ? 1 : 0.5) : 0;

  const actions = [
    { label: "New Project", run: () => { onClose(); onCreateProject?.(); } }, // Triggers In-App Modal
    { label: "New Note", run: () => { onClose(); onCreateNote?.(); } },
    { label: "Chronos", run: () => { onClose(); onOpenCronos?.(); } },

    { label: "Go to Opus", run: () => { onClose(); go?.("projects"); } },
    { label: "Go to Connexa", run: () => { onClose(); go?.("graph"); } },
    { label: "Go to Codex", run: () => { onClose(); go?.("overview"); } },
    { label: "Go to Journal", run: () => { onClose(); go?.("journal"); } },
    // { label: "Go to Ledger", run: () => { onClose(); go?.("ledger"); } }, // Merged into Journal
    { label: "Go to Home", run: () => { onClose(); go?.("home"); } },
  ].map(a => ({ ...a, _type: "action" }));

  const noteItems = notes
    .map(n => ({ _type: "note", label: n.title || "Untitled", noteId: n.id, run: () => { onClose(); onOpenNote?.(n.id); } }))
    .filter(n => score(n.label));

  const items = useMemo(() => {
    const act = actions.filter(a => score(a.label));
    const list = [...act, ...noteItems].sort((a, b) => score(b.label) - score(a.label));
    return list.slice(0, 12);
  }, [q, notes]); // eslint-disable-line

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
      if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); items[i]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i, items, onClose]); // Added items to dependency array for safety

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm transition-opacity" onMouseDown={onClose}>
      <div
        className="w-full max-w-[600px] rounded-[24px] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-white/10 bg-black/80 backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5">
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type a command or search notes..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-white/20 transition-all font-medium"
          />
        </div>
        <div className="max-h-[360px] overflow-auto p-2 space-y-1 custom-scrollbar">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">No matching commands or notes.</div>
          )}
          {items.map((it, idx) => (
            <button
              key={idx}
              onMouseEnter={() => setI(idx)}
              onClick={() => it.run()}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group outline-none",
                i === idx ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors shrink-0",
                  i === idx ? "bg-white text-black" : "bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300"
                )}>
                  {it._type === 'action' ? 'CMD' : 'DOC'}
                </div>
                <span>{it.label}</span>
              </div>
              {it._type === 'note' && <span className="text-[10px] opacity-40 uppercase font-medium">Note</span>}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-white/5 bg-black/40 text-[10px] text-zinc-600 flex justify-between uppercase tracking-widest font-bold">
          <span>Search, Navigate, Act</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}

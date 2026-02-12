import React, { useState, useCallback } from "react";
import EditorRich from "../components/EditorRich.jsx";
import ProjectIcon from "../components/ProjectIcon.jsx";
import { useDebounced } from "../hooks/useDebounced.js";

const modeKey = (id) => `maia:note-mode:${id}`;
const widthKey = () => `maia:editor-wide`;

export default function Editor({ note, updateNote }) {
  const [local, setLocal] = useState(note);
  const [mode, setMode] = useState(() => {
    if (note?.id) {
      const saved = localStorage.getItem(modeKey(note.id));
      return saved === "read" ? "read" : "edit";
    }
    return "edit";
  });
  const [wide, setWide] = useState(() => localStorage.getItem(widthKey()) === "true");

  const toggleWide = () => {
    setWide(prev => {
      const next = !prev;
      localStorage.setItem(widthKey(), String(next));
      return next;
    });
  };

  // Persist
  useDebounced(() => {
    if (local) updateNote(local);
  }, [local?.title, local?.content, local?.tags, local?.links, local?.wordCount, local?.charCount, local?.project], 250);

  if (!note) {
    return (
      <div className="h-full grid place-items-center text-zinc-500 font-mono">
        <div className="flex flex-col items-center gap-2">
          <ProjectIcon name="quill" size={32} className="opacity-20" />
          <span className="text-xs">Select a note to begin.</span>
        </div>
      </div>
    );
  }

  const editable = mode === "edit";
  const toggleMode = () => {
    const next = mode === "edit" ? "read" : "edit";
    setMode(next);
    if (local?.id) localStorage.setItem(modeKey(local.id), next);
  };

  return (
    <div className="h-full w-full relative flex flex-col items-center bg-black">

      {/* Main Content Area */}
      <div className={`w-full h-full flex flex-col min-h-0 z-10 transition-all duration-300 ${wide ? 'max-w-full px-4 md:px-8' : 'max-w-4xl'}`}>

        {/* Clean Dark Panel */}
        <div className="flex flex-col w-full h-full relative overflow-hidden bg-black/90 border border-white/10 rounded-2xl my-4 mx-auto shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="flex-none px-6 py-5 border-b border-white/5 flex items-start gap-4 z-20">
            <div className="flex-1 flex flex-col gap-1.5">
              <input
                value={local.title}
                onChange={(e) => setLocal({ ...local, title: e.target.value })}
                placeholder="Untitled Note"
                className="bg-transparent outline-none text-2xl md:text-3xl font-bold text-white placeholder:text-zinc-600 tracking-tight"
                style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" }}
              />
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                <span>{new Date(local.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {local.project && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-400">@{local.project}</span>
                  </>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Width Toggle */}
              <button
                onClick={toggleWide}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                title={wide ? "Narrow View" : "Wide View"}
              >
                <ProjectIcon name={wide ? "collapse" : "expand"} size={16} />
              </button>

              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                title={editable ? "Switch to Reading Mode" : "Switch to Editing Mode"}
              >
                <ProjectIcon name={editable ? "book" : "quill"} size={16} />
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="min-h-full px-6 py-6 pb-32">
              <EditorRich
                value={local.content || ""}
                editable={editable}
                onChange={useCallback((md) => setLocal((v) => ({ ...v, content: md })), [])}
                onMetaChange={useCallback((meta) => setLocal((v) => ({ ...v, ...meta })), [])}
                className="maia-editor"
              />
            </div>
          </div>
        </div>

        {/* Status Pill (Floating above dock) */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-4 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full text-[10px] text-zinc-500 font-mono shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3 pr-3 border-r border-white/10">
              <span>{(local?.wordCount ?? 0).toLocaleString()} words</span>
              <span className="text-zinc-700">•</span>
              <span>{(local?.charCount ?? 0).toLocaleString()} chars</span>
            </div>
            <div className="flex items-center gap-2">
              {(local.tags && local.tags.length > 0) ? (
                local.tags.map(t => (
                  <span key={t} className="text-zinc-400">#{t}</span>
                ))
              ) : (
                <span className="text-zinc-700 italic">No tags</span>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

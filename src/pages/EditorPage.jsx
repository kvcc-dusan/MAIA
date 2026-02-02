/* eslint-disable react/prop-types */
import React, { useState } from "react";
import EditorRich from "../components/EditorRich.jsx";
import GlassSurface from "../components/GlassSurface.jsx";
import ProjectIcon from "../components/ProjectIcon.jsx";
import { useDebounced } from "../hooks/useDebounced.js";

const modeKey = (id) => `maia:note-mode:${id}`;

export default function Editor({ note, updateNote, projects = [] }) {
  const [local, setLocal] = useState(note);
  const [mode, setMode] = useState(() => {
    if (note?.id) {
      const saved = localStorage.getItem(modeKey(note.id));
      return saved === "read" ? "read" : "edit";
    }
    return "edit";
  });

  // Persist
  useDebounced(() => {
    if (local) updateNote(local);
  }, [local?.title, local?.content, local?.tags, local?.links, local?.wordCount, local?.charCount, local?.project], 250);


  if (!note) {
    return (
      <div className="h-full grid place-items-center text-zinc-500">
        <div className="flex flex-col items-center gap-2">
          <ProjectIcon name="quill" size={32} className="opacity-20" />
          <span className="text-sm">Select a note to begin.</span>
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

      {/* Background Ambience (Optional) */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/20 to-black pointer-events-none" />

      {/* Main Glass Sheet */}
      <div className="w-full max-w-4xl h-full p-4 md:p-8 flex flex-col min-h-0 z-10">
        <GlassSurface className="shadow-2xl relative overflow-hidden">
          <div className="flex flex-col w-full h-full relative overflow-hidden">

            {/* Header */}
            <div className="flex-none px-6 py-5 border-b border-white/5 flex items-start gap-4 bg-black/10 backdrop-blur-sm z-20">
              <div className="flex-1 flex flex-col gap-1">
                <input
                  value={local.title}
                  onChange={(e) => setLocal({ ...local, title: e.target.value })}
                  placeholder="Untitled Note"
                  className="bg-transparent outline-none text-2xl md:text-3xl font-bold text-white placeholder:text-zinc-600 font-sans tracking-tight"
                />
                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                  <span>{new Date(local.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {local.project && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-400">@{local.project}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                title={editable ? "Switch to Reading Mode" : "Switch to Editing Mode"}
              >
                <ProjectIcon name={editable ? "book" : "quill"} size={20} />
              </button>
            </div>

            {/* Editor Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative text-lg">
              <div className="min-h-full px-6 py-6 md:px-12 pb-32">
                <EditorRich
                  value={local.content || ""}
                  editable={editable}
                  onChange={(md) => setLocal((v) => ({ ...v, content: md }))}
                  onMetaChange={(meta) => setLocal((v) => ({ ...v, ...meta }))}
                  className="maia-editor"
                />
              </div>
            </div>

            {/* Status Bar (Floating Pill) */}
            {/* Status Bar (Floating Pill) */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="flex items-center gap-4 px-4 py-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-[10px] text-zinc-400 font-mono shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5 pointer-events-auto transition-opacity duration-300 hover:bg-black/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">

                {/* Stats */}
                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                  <span>{(local?.wordCount ?? 0).toLocaleString()} Words</span>
                  <span>{(local?.charCount ?? 0).toLocaleString()} Chars</span>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2">
                  {(local.tags && local.tags.length > 0) ? (
                    local.tags.map(t => (
                      <span key={t} className="text-emerald-400">#{t}</span>
                    ))
                  ) : (
                    <span className="text-zinc-600 italic">No tags</span>
                  )}
                </div>

              </div>
            </div>

          </div>
        </GlassSurface>
      </div>

    </div>
  );
}

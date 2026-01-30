/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import EditorRich from "../components/EditorRich.jsx";
import GlassSurface from "../components/GlassSurface.jsx";
import ProjectIcon from "../components/ProjectIcon.jsx";
import { useDebounced } from "../hooks/useDebounced.js";

const modeKey = (id) => `maia:note-mode:${id}`;

export default function Editor({ note, updateNote, projects = [] }) {
  const [local, setLocal] = useState(note);
  const [mode, setMode] = useState("edit"); // "edit" | "read"

  useEffect(() => {
    setLocal(note);
    if (note?.id) {
      const saved = localStorage.getItem(modeKey(note.id));
      setMode(saved === "read" ? "read" : "edit");
    }
  }, [note?.id]);

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
        <GlassSurface className="flex flex-col w-full h-full shadow-2xl relative overflow-hidden">

          {/* Header */}
          <div className="flex-none px-8 py-6 border-b border-white/5 flex items-start gap-4">
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
              className={`p-2 rounded-lg transition-colors border ${editable ? 'bg-white/10 border-white/10 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              title={editable ? "Reading Mode" : "Editing Mode"}
            >
              <ProjectIcon name={editable ? "quill" : "book"} size={18} />
            </button>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="min-h-full px-8 py-8 md:px-12">
              <EditorRich
                value={local.content || ""}
                editable={editable}
                onChange={(md) => setLocal((v) => ({ ...v, content: md }))}
                onMetaChange={(meta) => setLocal((v) => ({ ...v, ...meta }))}
                className="maia-editor pb-32"
              />
            </div>
          </div>

          {/* New Status Bar (Bottom of Glass) */}
          <div className="flex-none h-8 border-t border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-4 text-[10px] text-zinc-500 font-mono uppercase tracking-wider select-none">

            {/* Left: Stats */}
            <div className="flex items-center gap-4">
              <span>{(local?.wordCount ?? 0).toLocaleString()} Words</span>
              <span>{(local?.charCount ?? 0).toLocaleString()} Chars</span>
            </div>

            {/* Right: Tags */}
            <div className="flex items-center gap-2">
              {(local.tags || []).map(t => (
                <span key={t} className="text-emerald-500/80">#{t}</span>
              ))}
            </div>

          </div>

        </GlassSurface>
      </div>

    </div>
  );
}

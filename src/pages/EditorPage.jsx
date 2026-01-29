/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import EditorRich from "../components/EditorRich.jsx";
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

  // Persist title, content, meta (tags/links) AND counts (words/chars)
  useDebounced(() => {
    if (local) updateNote(local);
  }, [local?.title, local?.content, local?.tags, local?.links, local?.wordCount, local?.charCount, local?.project], 250);


  if (!note) {
    return (
      <div className="h-full grid place-items-center text-zinc-500">
        Select or create a note.
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
    // IMPORTANT: middle track must be minmax(0,1fr) so it can shrink & scroll
    <div
      className="h-full grid min-h-0"
      style={{ gridTemplateRows: "auto minmax(0,1fr) auto" }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3">
        <input
          value={local.title}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
          placeholder="Title"
          className="flex-1 bg-transparent outline-none text-xl font-semibold text-zinc-100"
        />

        <div className="text-[11px] text-zinc-500">
          {new Date(local.createdAt).toLocaleString()}
        </div>



        {/* single-circle toggle: outline = Edit, filled = Read */}
        <button
          aria-label={editable ? "Switch to Read mode" : "Switch to Edit mode"}
          onClick={toggleMode}
          className="w-5 h-5 rounded-full grid place-items-center"
        >
          <span
            className={`inline-block w-3.5 h-3.5 rounded-full ${editable ? "border border-zinc-400" : "bg-zinc-100"
              }`}
          />
        </button>
      </div>

      {/* Editor area — this is the ONLY scroll container */}
      <div className="min-h-0 overflow-auto px-5 py-4 pb-16">
        <EditorRich
          value={local.content || ""}
          editable={editable}
          onChange={(md) => setLocal((v) => ({ ...v, content: md }))}
          onMetaChange={(meta) => setLocal((v) => ({ ...v, ...meta }))} // {tags, links, wordCount, charCount}
          className="maia-editor"
        />
      </div>

      {/* Footer — fixed floating above Dock */}
      <div
        data-tags-links
        className="fixed inset-x-0 bottom-24 mx-auto max-w-2xl px-5 py-2 flex items-center justify-center z-[40] pointer-events-none"
      >
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-6 pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
          {/* Tags */}
          {(local.tags || []).length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Tags</span>
              <div className="flex gap-1">
                {(local.tags || []).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(local.links || []).length > 0 && (
            <div className="flex gap-2 items-center border-l border-white/10 pl-4">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Links</span>
              <div className="flex gap-1">
                {(local.links || []).map((l) => (
                  <span
                    key={l}
                    className="px-2 py-0.5 inline-flex items-center rounded-md bg-white/5 border border-white/10 text-zinc-300 text-[10px]"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Word/Char counts */}
          <div className={`flex gap-3 items-center text-zinc-500 text-[10px] font-mono ${(local.tags?.length || local.links?.length) ? "border-l border-white/10 pl-4" : ""}`}>
            <span>
              {(local?.wordCount ?? 0).toLocaleString()} words
            </span>
            <span>
              {(local?.charCount ?? 0).toLocaleString()} chars
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

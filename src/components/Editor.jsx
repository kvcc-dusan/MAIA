/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import EditorRich from "./EditorRich.jsx";
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
            className={`inline-block w-3.5 h-3.5 rounded-full ${
              editable ? "border border-zinc-400" : "bg-zinc-100"
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

      {/* Footer — fixed to viewport bottom */}
      <div
        data-tags-links
        className="fixed inset-x-0 bottom-0 bg-black border-t border-zinc-800 px-5 py-2 text-xs text-zinc-400 flex items-center z-[9999]"
      >
        <div className="ml-auto flex items-center gap-6">
          {/* Tags */}
          <div className="flex gap-2 items-center">
            <span className="text-zinc-500">Tags</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {(local.tags || []).map((t) => (
                <span
                  key={t}
                  className="px-2 h-5 inline-flex items-center rounded-full border border-emerald-700/40 bg-emerald-900/25 text-emerald-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2 items-center">
            <span className="text-zinc-500">Links</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {(local.links || []).map((l) => (
                <span
                  key={l}
                  className="px-2 h-5 inline-flex items-center rounded-full border border-zinc-700 text-zinc-300"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Word/Char counts */}
          <div className="flex gap-2 items-center text-zinc-500">
            <span>
              {(local?.wordCount ?? 0).toLocaleString()} words • {(local?.charCount ?? 0).toLocaleString()} chars
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

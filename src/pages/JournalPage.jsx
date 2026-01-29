import React, { useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import EditorRich from "../components/EditorRich.jsx";

export default function Journal({ journal = [], setJournal }) {
    const [content, setContent] = useState("");

    const handleSubmit = () => {
        if (!content.trim()) return;
        const entry = {
            id: uid(),
            content: content,
            createdAt: isoNow(),
        };
        // Newest first
        setJournal([entry, ...journal]);
        setContent("");
    };

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

            {/* Input Area (Top) */}
            <div className="flex-1 min-h-0 flex flex-col p-6 lg:p-12 space-y-6 relative z-10">
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-mono text-white font-bold tracking-tight">Journal</h1>
                    <div className="text-xs text-zinc-500 font-mono">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </header>

                <div className="flex-1 border border-white/5 rounded-2xl bg-white/5 p-6 overflow-hidden flex flex-col backdrop-blur-sm shadow-inner transition-colors focus-within:bg-white/10 hover:border-white/10">
                    <EditorRich
                        value={content}
                        onChange={setContent}
                        editable={true}
                        className="flex-1 overflow-auto bg-transparent outline-none"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim()}
                        className="px-6 py-2 bg-zinc-100 text-black text-sm font-bold rounded-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/10"
                    >
                        Capture Entry
                    </button>
                </div>
            </div>

            {/* History (Bottom) */}
            <div className="h-[35%] border-t border-white/5 overflow-y-auto px-6 lg:px-12 py-8 bg-black/40 backdrop-blur-md relative z-10 custom-scrollbar">
                <div className="text-zinc-600 text-xs uppercase tracking-widest font-mono mb-8 font-bold">
                    Signal Stream // History
                </div>

                <div className="space-y-12">
                    {journal.length === 0 && (
                        <div className="text-zinc-700 italic text-sm">No entries recorded.</div>
                    )}
                    {journal.map(entry => (
                        <div key={entry.id} className="group relative border-l border-white/10 pl-6 py-1 hover:border-white/30 transition-colors">
                            <div className="absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-white transition-colors shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            <div className="text-zinc-500 text-xs font-mono mb-3 group-hover:text-zinc-400 transition-colors">
                                {new Date(entry.createdAt).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity text-zinc-300">
                                <EditorRich value={entry.content} editable={false} className="min-h-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

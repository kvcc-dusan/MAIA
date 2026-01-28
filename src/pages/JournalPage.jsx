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
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
            {/* Input Area (Top) */}
            <div className="flex-1 min-h-0 flex flex-col p-6 lg:p-12 space-y-6">
                <header className="flex items-center justify-between">
                    <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono">
                        Strategic Journal // Raw Cognition
                    </div>
                    <div className="text-zinc-600 text-xs font-mono">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </header>

                <div className="flex-1 border border-zinc-800/60 rounded-xl bg-zinc-950/20 p-6 overflow-hidden flex flex-col">
                    <EditorRich
                        value={content}
                        onChange={setContent}
                        editable={true}
                        className="flex-1 overflow-auto"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim()}
                        className="px-6 py-2 bg-zinc-100 text-black text-sm font-medium rounded-md hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Capture Entry
                    </button>
                </div>
            </div>

            {/* History (Bottom) */}
            <div className="h-[35%] border-t border-zinc-900 overflow-y-auto px-6 lg:px-12 py-8 bg-zinc-950/30">
                <div className="text-zinc-600 text-xs uppercase tracking-widest font-mono mb-8">
                    Signal Stream // History
                </div>

                <div className="space-y-12">
                    {journal.length === 0 && (
                        <div className="text-zinc-700 italic text-sm">No entries recorded.</div>
                    )}
                    {journal.map(entry => (
                        <div key={entry.id} className="group relative border-l border-zinc-800 pl-6 py-1">
                            <div className="absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />
                            <div className="text-zinc-500 text-xs font-mono mb-3">
                                {new Date(entry.createdAt).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <EditorRich value={entry.content} editable={false} className="min-h-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

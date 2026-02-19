import React, { useState } from 'react';
import { GlassCard } from "../../../components/GlassCard";
import ProjectIcon from "../../../components/ProjectIcon";
import { uid } from "../../../lib/ids";
import { Plus, X, ExternalLink } from "lucide-react";

export default function ResourcesPanel({ project, updateProject }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState("");

    const addLink = () => {
        if (!newLinkUrl) {
            setIsAdding(false);
            return;
        }

        let url = newLinkUrl;
        if (!url.startsWith('http')) url = 'https://' + url;

        try {
            const urlObj = new URL(url);
            const title = urlObj.hostname.replace('www.', '');
            const newLink = {
                id: uid(),
                url,
                title,
                type: 'link'
            };
            updateProject(project.id, { links: [...(project.links || []), newLink] });
        } catch (e) {
            // Invalid URL
        }
        setNewLinkUrl("");
        setIsAdding(false);
    };

    const removeLink = (id) => {
        updateProject(project.id, { links: (project.links || []).filter(l => l.id !== id) });
    };

    return (
        <div className="flex flex-col min-h-[200px] rounded-2xl bg-black border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <ProjectIcon name="link" size={14} />
                    Uplinks
                </h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="text-fluid-3xs p-1 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                >
                    <Plus size={14} />
                </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                {(project.links || []).map(link => (
                    <div key={link.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center gap-3 min-w-0"
                        >
                            <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0 text-zinc-500">
                                {/* Simple favicon fallback logic could go here, sticking to icon for now */}
                                <ExternalLink size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm text-zinc-300 group-hover:text-blue-300 font-medium truncate">{link.title}</div>
                                <div className="text-fluid-3xs text-zinc-600 truncate">{link.url}</div>
                            </div>
                        </a>
                        <button
                            onClick={() => removeLink(link.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded transition-all"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {isAdding && (
                    <div className="p-2">
                        <input
                            autoFocus
                            value={newLinkUrl}
                            onChange={e => setNewLinkUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addLink()}
                            onBlur={addLink}
                            placeholder="https://..."
                            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
                        />
                    </div>
                )}

                {(project.links || []).length === 0 && !isAdding && (
                    <div className="text-zinc-700 text-xs italic text-center py-4">
                        No uplinks established.
                    </div>
                )}
            </div>
        </div>
    );
}

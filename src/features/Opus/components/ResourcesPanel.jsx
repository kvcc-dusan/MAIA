import React, { useState } from 'react';
import { uid } from "../../../lib/ids";
import { PlusSignSquare as Plus, CancelSquare as X, Link04 as ExternalLink, Link01 as Link2 } from "../../../components/ui/CustomIcon.jsx";

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
        <div className="flex flex-col rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                    <Link2 size={12} className="text-subtle-foreground" />
                    <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold font-mono">
                        Uplinks
                    </h3>
                    <span className="text-xs text-subtle-foreground bg-overlay-subtle px-1.5 py-0.5 rounded-full font-mono">
                        {(project.links || []).length}
                    </span>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                    title="Add uplink"
                >
                    <Plus size={12} />
                </button>
            </div>

            <div className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                {(project.links || []).map(link => (
                    <div key={link.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-overlay-subtle transition-colors border border-transparent hover:border-border-subtle">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center gap-3 min-w-0"
                        >
                            <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0 text-muted-foreground">
                                {/* Simple favicon fallback logic could go here, sticking to icon for now */}
                                <ExternalLink size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm text-foreground-secondary group-hover:text-blue-300 font-medium truncate">{link.title}</div>
                                <div className="text-xs text-subtle-foreground truncate">{link.url}</div>
                            </div>
                        </a>
                        <button
                            onClick={() => removeLink(link.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-subtle-foreground hover:text-red-400 hover:bg-overlay-subtle rounded transition-all"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {isAdding && (
                    <input
                        autoFocus
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') setIsAdding(false); }}
                        onBlur={addLink}
                        placeholder="https://..."
                        className="w-full bg-overlay-subtle border border-border rounded-xl text-white text-xs outline-hidden focus:outline-hidden focus:border-white/25 transition-all placeholder:text-subtle-foreground font-mono px-3 py-2.5"
                    />
                )}

                {(project.links || []).length === 0 && !isAdding && (
                    <div className="text-faint-foreground text-xs italic text-center py-4">
                        No uplinks established.
                    </div>
                )}
            </div>
        </div>
    );
}

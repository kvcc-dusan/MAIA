import React, { useState } from 'react';
import { uid } from "../../../lib/ids";
import { PlusSignSquare as Plus, CancelSquare as X, Link04 as ExternalLink, Link01 as Link2 } from "../../../components/ui/CustomIcon.jsx";
import { SectionCard } from "../../../components/composed/SectionCard";

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
        <SectionCard
            icon={Link2}
            title="Uplinks"
            count={(project.links || []).length}
            bodyClassName="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar"
            action={
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                    title="Add uplink"
                >
                    <Plus size={12} />
                </button>
            }
        >
            {(project.links || []).map(link => (
                    <div key={link.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-overlay-subtle transition-colors border border-transparent hover:border-border-subtle">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center gap-3 min-w-0"
                        >
                            <div className="w-8 h-8 rounded bg-background/40 flex items-center justify-center shrink-0 text-muted-foreground">
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
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-subtle-foreground hover:text-destructive hover:bg-overlay-subtle rounded transition-all"
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
                        className="w-full bg-overlay-subtle border border-border rounded-xl text-foreground text-xs outline-hidden focus:outline-hidden focus:border-border-strong transition-all placeholder:text-subtle-foreground px-3 py-2.5"
                    />
                )}

                {(project.links || []).length === 0 && !isAdding && (
                    <div className="text-faint-foreground text-xs italic text-center py-4">
                        No uplinks established.
                    </div>
                )}
        </SectionCard>
    );
}

import React, { useMemo, useState } from 'react';
import { toast } from "sonner";
import { uid } from "../../../lib/ids";
import { PlusSignSquare as Plus, CancelSquare as X, Link04 as ExternalLink, Link01 as Link2, Pen01 as Pencil } from "../../../components/ui/CustomIcon.jsx";
import { SectionCard } from "../../../components/composed/SectionCard";
import { SectionLabel } from "../../../components/composed/SectionBits";

/**
 * Uplinks — the project's quick-access links.
 *
 * Links are grouped by `type`, which is derived from the hostname on add. The
 * field already existed in the schema ({id, title, url, type}) but every link
 * was written as type 'link', so nothing could ever group.
 *
 * Titles are still auto-derived from the hostname, but are now editable — the
 * whole point of a link list is that "Figma — v2 designs" beats
 * "figma.com", and previously a title could only be changed by deleting the
 * link and adding it again.
 */

const GROUPS = [
    { id: 'design', label: 'Design', hosts: ['figma.com', 'sketch.com', 'framer.com', 'dribbble.com', 'penpot.app'] },
    { id: 'code', label: 'Code', hosts: ['github.com', 'gitlab.com', 'bitbucket.org', 'vercel.com', 'netlify.app', 'netlify.com'] },
    { id: 'docs', label: 'Docs', hosts: ['notion.so', 'docs.google.com', 'linear.app', 'confluence.com', 'slite.com'] },
];
const OTHER = { id: 'other', label: 'Other' };

const linkTypeFor = (hostname) => {
    const host = hostname.replace(/^www\./, '');
    const hit = GROUPS.find(g => g.hosts.some(h => host === h || host.endsWith(`.${h}`)));
    return hit ? hit.id : OTHER.id;
};

/** Returns the parsed link fields, or null when the input isn't a usable URL. */
const parseLink = (raw) => {
    const withScheme = raw.startsWith('http') ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        if (!url.hostname.includes('.')) return null;
        return {
            url: withScheme,
            title: url.hostname.replace(/^www\./, ''),
            type: linkTypeFor(url.hostname),
        };
    } catch {
        return null;
    }
};

const hostOf = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
};

export default function ResourcesPanel({ project, updateProject }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [editingId, setEditingId] = useState(null);

    const links = useMemo(() => project.links || [], [project.links]);

    const grouped = useMemo(() => {
        const order = [...GROUPS, OTHER];
        return order
            .map(g => ({ ...g, items: links.filter(l => (l.type && l.type !== 'link' ? l.type : linkTypeFor(hostOf(l.url) || '')) === g.id) }))
            .filter(g => g.items.length > 0);
    }, [links]);

    const writeLinks = (next) => updateProject(project.id, { links: next });

    const addLink = () => {
        const raw = newLinkUrl.trim();
        if (!raw) {
            setIsAdding(false);
            return;
        }
        const parsed = parseLink(raw);
        if (!parsed) {
            // Previously an empty catch swallowed this and cleared the field, so
            // a typo looked identical to a successful add.
            toast.error(`"${raw}" isn't a valid URL.`);
            return;
        }
        writeLinks([...links, { id: uid(), ...parsed }]);
        setNewLinkUrl("");
        setIsAdding(false);
    };

    const saveEdit = (id, patch) => {
        writeLinks(links.map(l => (l.id === id ? { ...l, ...patch } : l)));
        setEditingId(null);
    };

    const removeLink = (id) => writeLinks(links.filter(l => l.id !== id));

    return (
        <SectionCard
            icon={Link2}
            title="Uplinks"
            count={links.length}
            bodyClassName="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar"
            action={
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                    aria-label="Add uplink"
                    title="Add uplink"
                >
                    <Plus size={12} />
                </button>
            }
        >
            {grouped.map(group => (
                <div key={group.id} className="pb-1">
                    {grouped.length > 1 && (
                        <SectionLabel className="block px-2 pt-2 pb-1 text-[10px]">{group.label}</SectionLabel>
                    )}
                    {group.items.map(link => (
                        editingId === link.id ? (
                            <LinkEditor
                                key={link.id}
                                link={link}
                                onSave={patch => saveEdit(link.id, patch)}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <LinkRow
                                key={link.id}
                                link={link}
                                onEdit={() => setEditingId(link.id)}
                                onRemove={() => removeLink(link.id)}
                            />
                        )
                    ))}
                </div>
            ))}

            {isAdding && (
                <input
                    autoFocus
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') { setNewLinkUrl(""); setIsAdding(false); } }}
                    onBlur={addLink}
                    placeholder="https://..."
                    aria-label="Uplink URL"
                    className="w-full bg-overlay-subtle border border-border rounded-xl text-foreground text-xs outline-hidden focus:outline-hidden focus:border-border-strong transition-all placeholder:text-subtle-foreground px-3 py-2.5"
                />
            )}

            {links.length === 0 && !isAdding && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full text-faint-foreground hover:text-muted-foreground text-xs italic text-center py-4 transition-colors"
                >
                    No uplinks established — add one.
                </button>
            )}
        </SectionCard>
    );
}

function LinkFavicon({ url }) {
    const host = hostOf(url);
    const [failed, setFailed] = useState(false);

    if (!host || failed) {
        return <ExternalLink size={12} />;
    }
    return (
        <img
            src={`https://www.google.com/s2/favicons?sz=64&domain=${host}`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-4 h-4 rounded-sm"
        />
    );
}

function LinkRow({ link, onEdit, onRemove }) {
    return (
        <div className="group flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-overlay-subtle transition-colors border border-transparent hover:border-border-subtle">
            <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center gap-2.5 min-w-0"
            >
                {/* Sized to the favicon rather than a 32px plate: in the
                    three-up layout this column is narrow, and every pixel of
                    chrome here comes straight out of the link's label. */}
                <div className="w-5 h-5 flex items-center justify-center shrink-0 text-muted-foreground">
                    <LinkFavicon url={link.url} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm text-foreground-secondary group-hover:text-blue-300 font-medium truncate">
                        {link.title || hostOf(link.url) || link.url}
                    </div>
                    <div className="text-xs text-subtle-foreground truncate">{link.url}</div>
                </div>
            </a>
            <button
                onClick={onEdit}
                aria-label={`Edit ${link.title || link.url}`}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded transition-all"
            >
                <Pencil size={12} />
            </button>
            <button
                onClick={onRemove}
                aria-label={`Remove ${link.title || link.url}`}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-subtle-foreground hover:text-destructive hover:bg-overlay-subtle rounded transition-all"
            >
                <X size={12} />
            </button>
        </div>
    );
}

const EDIT_INPUT = "w-full bg-overlay-subtle border border-border rounded-lg text-foreground text-xs outline-hidden focus:border-border-strong transition-all placeholder:text-subtle-foreground px-2.5 py-2";

function LinkEditor({ link, onSave, onCancel }) {
    const [title, setTitle] = useState(link.title || "");
    const [url, setUrl] = useState(link.url);

    const commit = () => {
        const parsed = parseLink(url.trim());
        if (!parsed) {
            toast.error(`"${url}" isn't a valid URL.`);
            return;
        }
        onSave({ title: title.trim() || parsed.title, url: parsed.url, type: parsed.type });
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className="p-2 space-y-1.5 rounded-lg bg-overlay-subtle border border-border-subtle">
            <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Label"
                aria-label="Uplink label"
                className={EDIT_INPUT}
            />
            <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="https://..."
                aria-label="Uplink URL"
                className={EDIT_INPUT}
            />
            <div className="flex justify-end gap-1.5 pt-0.5">
                <button onClick={onCancel} className="px-2 py-1 text-xs text-subtle-foreground hover:text-foreground-secondary rounded transition-colors">
                    Cancel
                </button>
                <button onClick={commit} className="px-2 py-1 text-xs font-medium text-foreground bg-overlay hover:bg-accent rounded transition-colors">
                    Save
                </button>
            </div>
        </div>
    );
}

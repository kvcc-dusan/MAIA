import React from 'react';
import { GlassCard } from "../../../components/GlassCard";
import ProjectIcon from "../../../components/ProjectIcon";
import { useData } from "../../../context/DataContext";

export default function KnowledgePanel({ project, selectNote }) {
    const { notes, removeProjectFromNote, deleteNote } = useData();

    // Logic: Links where projectIds includes project.id OR legacy project name matching
    // Sort by updatedAt desc
    const linkedNotes = notes
        .filter(n => {
            if (n.projectIds && n.projectIds.includes(project.id)) return true;
            if (n.project && n.project.toLowerCase() === project.name.toLowerCase()) return true;
            return false;
        })
        // Mock updatedAt for now since not all notes might have it, falling back to createdAt or now
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 10);

    const pinnedNotes = linkedNotes.filter(n => (project.pinnedNoteIds || []).includes(n.id));
    const recentNotes = linkedNotes.filter(n => !(project.pinnedNoteIds || []).includes(n.id));

    return (
        <div className="flex flex-col h-full min-h-[300px] rounded-2xl bg-black border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <ProjectIcon name="brain" size={14} />
                    Intel
                </h3>
                <span className="text-[10px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded-full">{linkedNotes.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">

                {/* Pinned Section */}
                {pinnedNotes.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold px-1">Pinned</div>
                        {pinnedNotes.map(n => (
                            <NoteRow
                                key={n.id}
                                note={n}
                                onClick={() => selectNote(n.id)}
                                pinned
                                onRemove={() => removeProjectFromNote(n.id, project.id)}
                                onDelete={() => deleteNote(n.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Recent Section */}
                <div className="space-y-2">
                    {pinnedNotes.length > 0 && <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold px-1 mt-2">Recent</div>}
                    {recentNotes.length === 0 && pinnedNotes.length === 0 ? (
                        <div className="text-zinc-700 text-xs italic text-center py-8">
                            No linked knowledge found. <br /> Use <span className="text-blue-500 font-mono">[[{project.name}]]</span> in your notes.
                        </div>
                    ) : (
                        recentNotes.map(n => (
                            <NoteRow
                                key={n.id}
                                note={n}
                                onClick={() => selectNote(n.id)}
                                onRemove={() => removeProjectFromNote(n.id, project.id)}
                                onDelete={() => deleteNote(n.id)}
                            />
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

function NoteRow({ note, onClick, pinned, onRemove, onDelete }) {
    const [showMenu, setShowMenu] = React.useState(false);

    return (
        <div className="relative group">
            <button
                onClick={onClick}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setShowMenu(true);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${pinned
                    ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/30"
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                    }`}
            >
                <div className="flex items-center gap-2 mb-1">
                    {pinned && <ProjectIcon name="pin" size={10} className="text-blue-400 shrink-0" />}
                    <div className={`text-sm font-medium truncate ${pinned ? "text-blue-100" : "text-zinc-300 group-hover:text-white"}`}>
                        {note.title || "Untitled Note"}
                    </div>
                </div>
                <div className="text-[10px] text-zinc-500 truncate font-mono">
                    {note.content?.slice(0, 60).replace(/[#*`]/g, '') || "No content..."}
                </div>
            </button>

            {/* Context Menu */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-6 z-50 w-32 bg-[#09090b] border border-white/10 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={(e) => { e.stopPropagation(); onClick(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white">
                            Open Note
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRemove(note.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white">
                            Unlink
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

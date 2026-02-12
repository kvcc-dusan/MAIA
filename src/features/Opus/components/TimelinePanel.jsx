import React from 'react';
import { GlassCard } from "../../../components/GlassCard";
import ProjectIcon from "../../../components/ProjectIcon";
import { useData } from "../../../context/DataContext";

// A simple vertical timeline component
export default function TimelinePanel({ project }) {
    const { tasks, sessions, notes } = useData();

    // Aggregate events
    // 1. Completed Tasks (that belong to project)
    const completedTasks = tasks
        .filter(t => t.projectId === project.id && t.done)
        .map(t => ({
            id: t.id,
            type: 'task',
            date: new Date(t.completedAt || t.createdAt), // Fallback if completedAt not tracked yet
            title: `Completed task: ${t.title}`,
            icon: 'check'
        }));

    // 2. Sessions (belonging to project)
    const projectSessions = sessions
        .filter(s => s.projectId === project.id)
        .map(s => ({
            id: s.id,
            type: 'session',
            date: new Date(s.end || s.start),
            title: `Deep Work Session (${s.duration}m)`,
            icon: 'lightning'
        }));

    // 3. Journal notes that mention this project
    const journalEntries = notes
        .filter(n => (n.tags || []).some(t => t.toLowerCase() === 'journal') && (n.content || '').toLowerCase().includes(project.name.toLowerCase()))
        .map(n => ({
            id: n.id,
            type: 'journal',
            date: new Date(n.createdAt),
            title: 'Journal Entry',
            preview: (n.content || '').slice(0, 50) + '...',
            icon: 'book'
        }));

    // Merge and Sort
    const timeline = [...completedTasks, ...projectSessions, ...journalEntries]
        .sort((a, b) => b.date - a.date)
        .slice(0, 5); // Just latest 5 for the panel

    return (
        <div className="flex flex-col gap-4 mt-8">
            <h3 className="text-xs uppercase tracking-widest text-zinc-600 font-bold px-1">Recent Activity</h3>

            <div className="relative border-l border-white/10 ml-3 space-y-6 pb-2">
                {timeline.length === 0 && (
                    <div className="pl-6 text-zinc-700 text-xs italic">No recorded activity yet.</div>
                )}

                {timeline.map((item, idx) => (
                    <div key={`${item.type}-${item.id}`} className="relative pl-6 group">
                        {/* Dot */}
                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-black group-hover:bg-blue-500 group-hover:border-blue-500/30 transition-all shadow-black shadow-lg z-10" />

                        <div className="flex flex-col">
                            <span className="text-zinc-500 text-[10px] font-mono mb-0.5">
                                {item.date.toLocaleDateString()} • {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-zinc-300 text-sm group-hover:text-white transition-colors">
                                {item.title}
                            </span>
                            {item.preview && (
                                <span className="text-zinc-600 text-xs mt-1 italic">{item.preview}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

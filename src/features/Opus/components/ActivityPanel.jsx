import React, { useState } from 'react';
import { GlassCard } from "../../../components/GlassCard";
import { Plus, Play, Circle, CheckCircle2 } from "lucide-react";
import ProjectIcon from "../../../components/ProjectIcon";
import { useData } from "../../../context/DataContext";

export default function ActivityPanel({ project }) {
    const { tasks, sessions, addTask, toggleTask, sessions: allSessions } = useData();
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // Filter Active Tasks for this project
    // Logic: task.projectId === project.id AND !task.done
    const activeTasks = tasks
        .filter(t => t.projectId === project.id && !t.done)
        .sort((a, b) => {
            // Sort by priority (p1 > p2 > p3)
            const pMap = { p1: 3, p2: 2, p3: 1 };
            return (pMap[b.priority] || 1) - (pMap[a.priority] || 1);
        })
        .slice(0, 5); // Take top 5

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        addTask(newTaskTitle, null, "", project.id);
        setNewTaskTitle("");
    };

    // Get next session if any
    const nextSession = sessions
        .filter(s => s.projectId === project.id && new Date(s.start) > new Date())
        .sort((a, b) => new Date(a.start) - new Date(b.start))[0];

    return (
        <div className="flex flex-col h-full min-h-[300px] rounded-2xl bg-black border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <ProjectIcon name="lightning" size={14} />
                    Execution
                </h3>
                {/* Placeholder for "Start Session" - in real app would trigger Chronos */}
                <button
                    onClick={() => alert("Enter Focus Mode: Filters Kronos to this project.")}
                    className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded border border-blue-500/20 transition-all"
                    title="Enter Focus Mode"
                >
                    <Play size={10} fill="currentColor" />
                    <span>Focus</span>
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-4">
                {/* Quick Add */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Plus size={14} className="text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                    </div>
                    <input
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                        className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/5 focus:border-white/20 rounded-xl py-2.5 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
                        placeholder="Add new task..."
                    />
                </div>

                {/* Task List */}
                <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                    {activeTasks.length === 0 ? (
                        <div className="h-20 flex flex-col items-center justify-center text-zinc-700 text-xs italic">
                            <CheckCircle2 size={20} className="mb-2 opacity-50" />
                            All clear. Add a task to build momentum.
                        </div>
                    ) : (
                        activeTasks.map(t => (
                            <div key={t.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <button
                                    onClick={() => toggleTask(t.id)}
                                    className="text-zinc-600 hover:text-emerald-500 transition-colors"
                                >
                                    <Circle size={16} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">{t.title}</div>
                                    {t.due && (
                                        <div className="text-[10px] text-zinc-600">
                                            Due {new Date(t.due).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                {/* Priority Dot */}
                                {t.priority === 'p1' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_currentColor]" />}
                                {t.priority === 'p2' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_currentColor]" />}
                            </div>
                        ))
                    )}
                </div>

                {/* Next Session Preview */}
                {nextSession && (
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2">Upcoming Session</div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-white">{nextSession.title || "Focus Session"}</div>
                                <div className="text-xs text-zinc-500">
                                    {new Date(nextSession.start).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                            <div className="text-xs font-mono text-zinc-400 bg-black/50 px-2 py-1 rounded">
                                {nextSession.duration}m
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

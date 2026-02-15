import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X, CheckSquare, Square, Calendar, Layers, Hash } from "lucide-react";
import { useData } from "../../../context/DataContext";
import { uid } from "../../../lib/ids";
import { cn } from "@/lib/utils";

/**
 * ProjectContext — Layer 4
 * Collapsed accordion: Strategic Directive + Success Criteria + Phase + Metadata
 */
export default function ProjectContext({ project, updateProject }) {
    const { tasks, sessions } = useData();
    const [isExpanded, setIsExpanded] = useState(false);
    const [newCriteria, setNewCriteria] = useState("");

    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectSessions = sessions.filter(s => s.projectId === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.done).length;
    const totalSessions = projectSessions.length;

    const addCriteria = () => {
        if (!newCriteria.trim()) return;
        const criteria = { id: uid(), text: newCriteria.trim(), done: false };
        updateProject(project.id, {
            successCriteria: [...(project.successCriteria || []), criteria]
        });
        setNewCriteria("");
    };

    const toggleCriteria = (id) => {
        const updated = (project.successCriteria || []).map(c =>
            c.id === id ? { ...c, done: !c.done } : c
        );
        updateProject(project.id, { successCriteria: updated });
    };

    const removeCriteria = (id) => {
        const updated = (project.successCriteria || []).filter(c => c.id !== id);
        updateProject(project.id, { successCriteria: updated });
    };

    return (
        <div className={cn(
            "rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300",
            isExpanded ? "" : "hover:border-white/20"
        )}>
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                        Project Context
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Compact metadata when collapsed */}
                    {!isExpanded && (
                        <div className="flex items-center gap-4 text-[10px] text-zinc-700 font-mono">
                            {project.description && (
                                <span className="max-w-[200px] truncate text-zinc-600">{project.description}</span>
                            )}
                            <span>{completedTasks}/{totalTasks} tasks</span>
                        </div>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                    {/* Strategic Directive */}
                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-2 block">
                            Strategic Directive
                        </label>
                        <textarea
                            value={project.description}
                            onChange={e => updateProject(project.id, { description: e.target.value })}
                            className="w-full min-h-[80px] text-sm font-light leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-none resize-none placeholder:text-zinc-800 placeholder:italic text-white/90"
                            placeholder="Define the core objective and desired outcome..."
                        />
                    </div>

                    {/* Success Criteria */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-3 block">
                            Success Criteria
                        </label>
                        <div className="space-y-2 mb-3">
                            {(project.successCriteria || []).map(c => (
                                <div key={c.id} className="flex items-start gap-3 group/item">
                                    <button
                                        onClick={() => toggleCriteria(c.id)}
                                        className={`mt-0.5 ${c.done ? "text-[#93FD23]" : "text-zinc-600 hover:text-zinc-400"} transition-colors`}
                                    >
                                        {c.done ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <span className={`text-sm flex-1 leading-relaxed ${c.done ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                                        {c.text}
                                    </span>
                                    <button
                                        onClick={() => removeCriteria(c.id)}
                                        className="opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Plus size={14} className="text-zinc-600" />
                            <input
                                value={newCriteria}
                                onChange={e => setNewCriteria(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCriteria()}
                                placeholder="Add success criteria..."
                                className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 outline-none flex-1"
                            />
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-[10px] text-zinc-700 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                <Calendar size={10} /> Created
                            </div>
                            <div className="text-sm text-zinc-500 font-mono">
                                {project.createdAt ? new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-700 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                <Hash size={10} /> Tasks
                            </div>
                            <div className="text-sm text-zinc-500 font-mono">
                                {completedTasks}/{totalTasks}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-700 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                <Layers size={10} /> Sessions
                            </div>
                            <div className="text-sm text-zinc-500 font-mono">
                                {totalSessions}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

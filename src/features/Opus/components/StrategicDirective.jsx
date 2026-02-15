import React, { useState } from 'react';
import { GlassCard, GlassTextarea } from "../../../components/GlassCard";
import { Plus, X, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { uid } from "../../../lib/ids";
import { cn } from "@/lib/utils";

export default function StrategicDirective({ project, updateProject }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [newCriteria, setNewCriteria] = useState("");

    const addCriteria = () => {
        if (!newCriteria.trim()) return;
        const criteria = {
            id: uid(),
            text: newCriteria.trim(),
            done: false
        };
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
            "rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 h-full flex flex-col",
            isExpanded ? "p-6" : "p-6 hover:border-white/20 cursor-pointer"
        )}
            onClick={() => !isExpanded && setIsExpanded(true)}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Strategic Directive</span>
                    </div>

                    {/* Collapsed View: Just the first line or placeholder */}
                    {!isExpanded ? (
                        <div className="text-zinc-300 text-sm truncate font-light">
                            {project.description || "Define core objective..."}
                        </div>
                    ) : (
                        /* Expanded View: Full Edit */
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <textarea
                                value={project.description}
                                onChange={e => updateProject(project.id, { description: e.target.value })}
                                className="w-full min-h-[80px] text-lg font-light leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-none resize-none placeholder:text-zinc-800 placeholder:italic text-white/90"
                                placeholder="Define the core objective and desired outcome..."
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-white transition-colors ml-4"
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Expanded Content: Success Criteria */}
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in duration-500">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mb-3 block">Success Criteria</label>

                    <div className="space-y-2 mb-4">
                        {(project.successCriteria || []).map(c => (
                            <div key={c.id} className="flex items-start gap-3 group/item">
                                <button
                                    onClick={() => toggleCriteria(c.id)}
                                    className={`mt-0.5 ${c.done ? "text-emerald-500" : "text-zinc-600 hover:text-zinc-400"} transition-colors`}
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
            )}
        </div>
    );
}

import React, { useState } from 'react';
import { GlassCard, GlassTextarea } from "../../../components/GlassCard";
import { Plus, X, CheckSquare, Square } from "lucide-react";
import { uid } from "../../../lib/ids";

export default function ObjectiveBlock({ project, updateProject }) {
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
        <div className="p-6 relative overflow-hidden group rounded-2xl bg-[#09090b] border border-white/10 shadow-2xl">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-zinc-500 rounded-full" />
                Strategic Directive
            </h3>

            <div className="space-y-6">
                {/* Mission Statement */}
                <div className="relative">
                    <GlassTextarea
                        value={project.description}
                        onChange={e => updateProject(project.id, { description: e.target.value })}
                        className="min-h-[100px] text-lg font-light leading-relaxed bg-transparent border-none p-0 focus:ring-0 resize-none placeholder:text-zinc-700 placeholder:italic text-white/90"
                        placeholder="Define the core objective and desired outcome..."
                    />
                </div>

                {/* Success Criteria */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Success Criteria</label>

                    <div className="space-y-2">
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

                    <div className="flex items-center gap-2 mt-2">
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
            </div>
        </div>
    );
}

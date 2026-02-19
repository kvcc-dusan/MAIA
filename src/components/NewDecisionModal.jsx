import React, { useState } from "react";
import { GlassCard, GlassInput, GlassTextarea } from "./GlassCard";
import ProjectIcon from "./ProjectIcon";

export default function NewDecisionModal({ onClose, onSubmit }) {
    const [draft, setDraft] = useState({
        title: "",
        stakes: "medium", // low, medium, high
        reversibility: "irreversible", // reversible, costly, irreversible
        assumptions: "",
        confidence: 70,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!draft.title.trim()) return;
        onSubmit({
            ...draft,
            assumptions: draft.assumptions.split('\n').filter(l => l.trim().length > 0),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg">
                <GlassCard variant="dark" className="p-6 relative">
                    <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>

                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
                        <ProjectIcon name="flag" size={20} className="text-blue-500" />
                        Log Strategic Decision
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Decision Title</label>
                            <GlassInput
                                autoFocus
                                placeholder="e.g. Migration to Postgres"
                                value={draft.title}
                                onChange={e => setDraft({ ...draft, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Stakes</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-zinc-300 outline-none appearance-none focus:bg-white/10 cursor-pointer"
                                        value={draft.stakes}
                                        onChange={e => setDraft({ ...draft, stakes: e.target.value })}
                                    >
                                        <option value="low">Low Stakes</option>
                                        <option value="medium">Medium Stakes</option>
                                        <option value="high">High Stakes</option>
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                                        <ProjectIcon name="sliders" size={12} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Reversibility</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-zinc-300 outline-none appearance-none focus:bg-white/10 cursor-pointer"
                                        value={draft.reversibility}
                                        onChange={e => setDraft({ ...draft, reversibility: e.target.value })}
                                    >
                                        <option value="reversible">Reversible</option>
                                        <option value="costly">Costly</option>
                                        <option value="irreversible">Irreversible</option>
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                                        <ProjectIcon name="sliders" size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Key Assumptions (Lines)</label>
                            <GlassTextarea
                                className="min-h-[100px]"
                                placeholder="- Zero downtime required&#10;- Cost under $50/mo"
                                value={draft.assumptions}
                                onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Confidence</label>
                                <span className="text-xs font-mono text-zinc-300">{draft.confidence}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="100" step="5"
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                value={draft.confidence}
                                onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">Log Decision</button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}

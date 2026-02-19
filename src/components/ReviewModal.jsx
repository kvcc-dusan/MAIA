import React, { useState } from "react";
import { GlassCard, GlassTextarea } from "./GlassCard";
import { cn } from "@/lib/utils";

export default function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success");

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg">
                <GlassCard variant="dark" className="p-6 relative">
                    <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>

                    <h2 className="text-lg font-bold text-white mb-6">Review Outcome</h2>

                    <GlassCard variant="default" className="mb-6">
                        <div className="text-fluid-3xs uppercase tracking-widest text-zinc-500 mb-1">Decision</div>
                        <div className="text-zinc-200 font-medium">{decision.title}</div>
                        <div className="mt-3 text-fluid-3xs uppercase tracking-widest text-zinc-500 mb-1">Assumptions</div>
                        <ul className="list-disc list-inside text-zinc-400 text-xs space-y-0.5">
                            {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </GlassCard>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Actual Outcome</label>
                            <GlassTextarea
                                className="min-h-[100px]"
                                autoFocus
                                value={outcome}
                                onChange={e => setOutcome(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-500">Result Assessment</label>
                            <div className="flex bg-white/5 rounded-lg border border-white/5 p-1 gap-1">
                                {['success', 'mixed', 'failure'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={cn(
                                            "flex-1 capitalize text-xs font-bold py-2 rounded-md transition-all",
                                            status === s
                                                ? (s === 'success' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : s === 'failure' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300')
                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-white/5">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">Cancel</button>
                            <button
                                onClick={() => onReview({ outcome, status })}
                                className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                            >
                                Complete Review
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

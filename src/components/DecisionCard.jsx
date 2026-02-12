import React from "react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

export default function DecisionCard({ d, onReviewStart }) {
    return (
        <GlassCard hover={false} className="group relative transition-all duration-300 hover:bg-white/[0.07] hover:border-white/10">
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                    <div className="text-zinc-200 font-bold text-sm tracking-tight">{d.title}</div>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold",
                            d.stakes === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                d.stakes === 'medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                                    'border-blue-500/30 text-blue-400 bg-blue-500/10'
                        )}>{d.stakes}</span>

                        <span className="text-[10px] text-zinc-500 border border-white/5 px-1.5 py-0.5 rounded bg-black/20 uppercase tracking-wider">{d.reversibility}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Conf: {d.confidence}%</span>
                    </div>
                </div>

                {d.status === "open" && (
                    <button
                        onClick={() => onReviewStart(d.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-zinc-300"
                    >
                        Review
                    </button>
                )}

                {d.status === "reviewed" && (
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                        d.outcomeStatus === 'success' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                            d.outcomeStatus === 'failure' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                    )}>
                        {d.outcomeStatus}
                    </div>
                )}
            </div>

            {/* Assumptions */}
            <div className="space-y-1 pl-3 border-l-2 border-white/5">
                {d.assumptions.slice(0, 3).map((a, i) => (
                    <div key={i} className="text-xs text-zinc-400 leading-relaxed max-w-[90%] truncate">• {a}</div>
                ))}
                {d.assumptions.length > 3 && <div className="text-[10px] text-zinc-600 italic">+{d.assumptions.length - 3} more</div>}
            </div>

            {/* Outcome View */}
            {d.status === "reviewed" && (
                <div className="mt-4 pt-3 border-t border-white/5 bg-black/20 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Outcome</div>
                    <div className="text-zinc-300 text-xs leading-relaxed">{d.outcome}</div>
                </div>
            )}

            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600">
                {new Date(d.createdAt).toLocaleDateString()}
            </div>
        </GlassCard>
    );
}

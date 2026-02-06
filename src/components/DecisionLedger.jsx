import React, { useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { GlassCard, GlassInput, GlassTextarea } from "./GlassCard";
import ProjectIcon from "./ProjectIcon";
import { cn } from "@/lib/utils";

function NewDecisionModal({ onClose, onSubmit }) {
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
                    <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>

                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
                        <ProjectIcon name="flag" size={20} className="text-blue-500" />
                        Log Strategic Decision
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Decision Title</label>
                            <GlassInput
                                autoFocus
                                placeholder="e.g. Migration to Postgres"
                                value={draft.title}
                                onChange={e => setDraft({ ...draft, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stakes</label>
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
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reversibility</label>
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
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Key Assumptions (Lines)</label>
                            <GlassTextarea
                                className="min-h-[100px]"
                                placeholder="- Zero downtime required&#10;- Cost under $50/mo"
                                value={draft.assumptions}
                                onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Confidence</label>
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

function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success");

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg">
                <GlassCard variant="dark" className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>

                    <h2 className="text-lg font-bold text-white mb-6">Review Outcome</h2>

                    <GlassCard variant="default" className="mb-6">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Decision</div>
                        <div className="text-zinc-200 font-medium">{decision.title}</div>
                        <div className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Assumptions</div>
                        <ul className="list-disc list-inside text-zinc-400 text-xs space-y-0.5">
                            {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </GlassCard>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actual Outcome</label>
                            <GlassTextarea
                                className="min-h-[100px]"
                                autoFocus
                                value={outcome}
                                onChange={e => setOutcome(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Result Assessment</label>
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

export default function DecisionLedger({ ledger = [], setLedger }) {
    const [isCreating, setIsCreating] = useState(false);
    const [reviewingId, setReviewingId] = useState(null);

    const addDecision = (data) => {
        const newDecision = {
            id: uid(),
            createdAt: isoNow(),
            status: "open",
            ...data
        };
        setLedger([newDecision, ...ledger]);
        setIsCreating(false);
    };

    const completeReview = (result) => {
        setLedger(prev => prev.map(d =>
            d.id === reviewingId
                ? { ...d, status: "reviewed", reviewedAt: isoNow(), outcome: result.outcome, outcomeStatus: result.status }
                : d
        ));
        setReviewingId(null);
    };

    const openDecisions = ledger.filter(d => d.status === "open");
    const reviewedDecisions = ledger.filter(d => d.status === "reviewed");

    const DecisionCard = ({ d }) => (
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
                        onClick={() => setReviewingId(d.id)}
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

    return (
        <div className="h-full flex flex-col w-full max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8 pt-2">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Decision Ledger</h2>
                    <p className="text-zinc-500 text-sm mt-1">Track strategic choices and calibrate intuition.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                    <ProjectIcon name="plus" size={14} className="text-black" />
                    Log Decision
                </button>
            </header>

            <div className="flex-1 overflow-y-auto space-y-8 min-h-0 pb-12 custom-scrollbar pr-2">
                {/* Active Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Open Loops ({openDecisions.length})</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                        {openDecisions.length === 0 && (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-white/5 rounded-xl text-zinc-600 text-sm">
                                No open decisions. Good clarity.
                            </div>
                        )}
                        {openDecisions.map(d => <DecisionCard key={d.id} d={d} />)}
                    </div>
                </section>

                {/* Reviewed Section */}
                {reviewedDecisions.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Closed & Reviewed ({reviewedDecisions.length})</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 opacity-80">
                            {reviewedDecisions.map(d => <DecisionCard key={d.id} d={d} />)}
                        </div>
                    </section>
                )}
            </div>

            {isCreating && <NewDecisionModal onClose={() => setIsCreating(false)} onSubmit={addDecision} />}
            {reviewingId && <ReviewModal decision={ledger.find(d => d.id === reviewingId)} onClose={() => setReviewingId(null)} onReview={completeReview} />}

        </div>
    );
}

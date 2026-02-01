import React, { useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import GlassSurface from "./GlassSurface.jsx";
import { GlassCard, GlassInput, GlassTextarea } from "./GlassCard.jsx";
import ProjectIcon from "./ProjectIcon.jsx";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg p-4" onClick={e => e.stopPropagation()}>
                <GlassSurface className="p-6 relative flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ProjectIcon name="flag" size={20} className="text-blue-400" />
                            Log New Decision
                        </h2>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <ProjectIcon name="times" size={20} /> {/* Fallback to x if times missing, using standard char below if needed */}
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Decision</label>
                            <GlassInput
                                autoFocus
                                placeholder="e.g. Migration to Postgres"
                                value={draft.title}
                                onChange={e => setDraft({ ...draft, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Stakes</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-zinc-200 outline-none focus:bg-white/10 focus:border-white/20 transition-colors appearance-none"
                                        value={draft.stakes}
                                        onChange={e => setDraft({ ...draft, stakes: e.target.value })}
                                    >
                                        <option value="low">Low Stakes</option>
                                        <option value="medium">Medium Stakes</option>
                                        <option value="high">High Stakes</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Reversibility</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-zinc-200 outline-none focus:bg-white/10 focus:border-white/20 transition-colors appearance-none"
                                        value={draft.reversibility}
                                        onChange={e => setDraft({ ...draft, reversibility: e.target.value })}
                                    >
                                        <option value="reversible">Reversible</option>
                                        <option value="costly">Costly to Reverse</option>
                                        <option value="irreversible">Irreversible</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Key Assumptions (One per line)</label>
                            <GlassTextarea
                                placeholder="- Usage will stick below 1k DAU&#10;- AWS cost won't exceed $50"
                                value={draft.assumptions}
                                onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                                className="min-h-[120px]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Confidence ({draft.confidence}%)</label>
                            <input
                                type="range"
                                min="0" max="100" step="5"
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                value={draft.confidence}
                                onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">Log Decision</button>
                        </div>
                    </form>
                </GlassSurface>
            </div>
        </div>
    );
}

function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success"); // success, failure, mixed

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg p-4" onClick={e => e.stopPropagation()}>
                <GlassSurface className="p-6 relative flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ProjectIcon name="check" size={20} className="text-emerald-400" />
                            Review Outcome
                        </h2>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">✕</button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                        <div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">Decision</div>
                            <div className="text-zinc-200 font-medium">{decision.title}</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">Assumptions</div>
                            <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1">
                                {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Actual Outcome</label>
                            <GlassTextarea
                                autoFocus
                                value={outcome}
                                onChange={e => setOutcome(e.target.value)}
                                className="min-h-[120px]"
                                placeholder="What actually happened?"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5 font-bold tracking-wider">Result Assessment</label>
                            <div className="flex bg-white/5 rounded-lg border border-white/10 p-1 gap-1">
                                {['success', 'mixed', 'failure'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`flex-1 capitalize text-sm py-2 rounded-md transition-all font-medium ${status === s
                                            ? (s === 'success' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' :
                                               s === 'failure' ? 'bg-rose-500/20 text-rose-300 shadow-sm' :
                                               'bg-amber-500/20 text-amber-300 shadow-sm')
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm">Cancel</button>
                            <button
                                onClick={() => onReview({ outcome, status })}
                                className="px-6 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                            >
                                Complete Review
                            </button>
                        </div>
                    </div>
                </GlassSurface>
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
            status: "open", // open, reviewed
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
        <GlassCard className="group relative flex flex-col gap-3 hover:bg-white/10 transition-all duration-300">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="text-zinc-200 font-medium text-lg leading-tight">{d.title}</div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                        <span className={`px-2 py-0.5 rounded border ${
                            d.stakes === 'high' ? 'border-rose-500/30 text-rose-400' :
                            d.stakes === 'medium' ? 'border-amber-500/30 text-amber-400' :
                            'border-emerald-500/30 text-emerald-400'
                        }`}>{d.stakes} Stakes</span>
                        <span className="text-zinc-600">|</span>
                        <span>{d.reversibility}</span>
                        <span className="text-zinc-600">|</span>
                        <span>{d.confidence}% Conf</span>
                    </div>
                </div>

                {d.status === "open" && (
                    <button
                        onClick={() => setReviewingId(d.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/5"
                    >
                        Review
                    </button>
                )}
                {d.status === "reviewed" && (
                    <div className={`text-xs px-2 py-1 rounded-md border font-bold uppercase tracking-wider ${
                        d.outcomeStatus === 'success' ? 'border-emerald-900/50 bg-emerald-500/10 text-emerald-400' :
                        d.outcomeStatus === 'failure' ? 'border-rose-900/50 bg-rose-500/10 text-rose-400' :
                        'border-amber-900/50 bg-amber-500/10 text-amber-400'
                    }`}>
                        {d.outcomeStatus}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 w-full my-1" />

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Assumptions</div>
                    <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1">
                        {d.assumptions.map((a, i) => <li key={i} className="leading-relaxed">{a}</li>)}
                    </ul>
                </div>

                {d.status === "reviewed" && (
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Outcome</div>
                        <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{d.outcome}</div>
                    </div>
                )}
            </div>

            <div className="mt-2 text-[10px] text-zinc-600 font-mono text-right">
                Logged {new Date(d.createdAt).toLocaleDateString()}
            </div>
        </GlassCard>
    );

    return (
        <div className="h-full flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-300 p-6 md:px-12 pt-6">
            <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        Decision Ledger
                    </h2>
                    <p className="text-zinc-500 text-sm mt-2 max-w-md leading-relaxed">
                        A systematic record of strategic choices, expected outcomes, and retrospective learnings to calibrate intuition over time.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs uppercase tracking-wider font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                    <ProjectIcon name="quill" size={16} />
                    Log Decision
                </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 min-h-0 pb-12 pr-2">
                {/* Active Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 sticky top-0 bg-black/50 backdrop-blur-md py-2 z-10">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse" />
                        <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Open Loops ({openDecisions.length})</h3>
                    </div>
                    <div className="grid gap-4">
                        {openDecisions.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-zinc-700 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                <ProjectIcon name="layers" size={32} className="mb-3 opacity-50" />
                                <span className="text-sm font-medium">No open decisions awaiting review.</span>
                            </div>
                        )}
                        {openDecisions.map(d => <DecisionCard key={d.id} d={d} />)}
                    </div>
                </section>

                {/* Reviewed Section */}
                {reviewedDecisions.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-4 sticky top-0 bg-black/50 backdrop-blur-md py-2 z-10">
                            <div className="w-2 h-2 rounded-full bg-zinc-600" />
                            <h3 className="text-xs uppercase tracking-widest text-zinc-600 font-bold">Closed & Reviewed ({reviewedDecisions.length})</h3>
                        </div>
                        <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity duration-300">
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

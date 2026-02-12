import React, { useState, useMemo, useCallback } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { cn } from "@/lib/utils";
import { Plus, ListFilter, Settings, Trash2, Scale } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   LedgerPage  –  Polished & Unified Design
   ────────────────────────────────────────────────────────── */

// Shared Design Tokens (matching ChronosModal & Strategic Directive)
const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";

// Minimal Input Style (No background, no borders)
const INPUT_CLEAN = "w-full bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-700/50 font-mono transition-all resize-none p-0 focus:ring-0";
const LABEL_CLASS = "text-[10px] font-bold uppercase tracking-widest text-zinc-600 font-mono mb-3 block";

// ─── Shared Components ───

function CloseButton({ onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors", className)}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    )
}

// ─── New Decision Modal ───

function NewDecisionModal({ onClose, onSubmit }) {
    const [draft, setDraft] = useState({
        title: "",
        stakes: "medium",
        reversibility: "irreversible",
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
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white flex items-center gap-2 font-mono">
                        <Scale size={14} className="text-zinc-500" />
                        Log Decision
                    </h2>
                    <CloseButton onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-8">
                    {/* Title Input (Hero Style) */}
                    <div>
                        <input
                            autoFocus
                            placeholder="Decision Title..."
                            value={draft.title}
                            onChange={e => setDraft({ ...draft, title: e.target.value })}
                            className={cn(INPUT_CLEAN, "text-xl font-medium placeholder:text-zinc-700")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={LABEL_CLASS}>Stakes</label>
                            {/* Minimal Toggle Group (No container border) */}
                            <div className="flex gap-1">
                                {['low', 'medium', 'high'].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, stakes: s })}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all",
                                            draft.stakes === s
                                                ? (s === 'high' ? 'bg-red-500/10 text-red-400' : s === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400')
                                                : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Reversibility</label>
                            <div className="flex gap-1">
                                {['reversible', 'costly', 'irreversible'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, reversibility: r })}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all",
                                            draft.reversibility === r
                                                ? 'bg-white/10 text-zinc-200'
                                                : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                                        )}
                                    >
                                        {r === 'irreversible' ? 'Final' : r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Key Assumptions</label>
                        <textarea
                            className={cn(INPUT_CLEAN, "min-h-[80px] text-sm leading-relaxed")}
                            placeholder={"- Zero downtime required\n- Cost under $50/mo"}
                            value={draft.assumptions}
                            onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className={cn(LABEL_CLASS, "mb-0")}>Confidence</label>
                            <span className="text-xs font-mono text-zinc-500 tabular-nums">{draft.confidence}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100" step="5"
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/10 transition-colors"
                            value={draft.confidence}
                            onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                        <button type="submit" className="text-xs font-bold font-mono uppercase tracking-wider text-white hover:text-zinc-300 transition-colors">
                            Log Decision
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Review Modal ───

function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success");

    if (!decision) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white font-mono">Review Outcome</h2>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="px-8 pb-8 space-y-8">
                    {/* Decision Summary */}
                    <div>
                        <div className="text-xl font-medium text-zinc-200 font-mono mb-2">{decision.title}</div>
                        {decision.assumptions && decision.assumptions.length > 0 && (
                            <div className="space-y-1">
                                {decision.assumptions.map((a, i) => (
                                    <div key={i} className="text-xs font-mono text-zinc-500 leading-relaxed">• {a}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <label className={LABEL_CLASS}>Actual Outcome</label>
                        <textarea
                            autoFocus
                            className={cn(INPUT_CLEAN, "min-h-[80px] text-sm leading-relaxed")}
                            placeholder="What actually happened..."
                            value={outcome}
                            onChange={e => setOutcome(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Result Assessment</label>
                        <div className="flex gap-2">
                            {['success', 'mixed', 'failure'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all",
                                        status === s
                                            ? (s === 'success' ? 'bg-emerald-500/10 text-emerald-400' : s === 'failure' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400')
                                            : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                        <button
                            onClick={() => onReview({ outcome, status })}
                            className="text-xs font-bold font-mono uppercase tracking-wider text-white hover:text-zinc-300 transition-colors"
                        >
                            Complete Review
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Decision Card ───

function DecisionCard({ d, onReview }) {
    const dateObj = new Date(d.createdAt);
    const now = new Date();
    const isToday = dateObj.getDate() === now.getDate() && dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    const dateStr = isToday ? "TODAY" : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const isReviewed = d.status === "reviewed";
    const assumptions = d.assumptions || [];

    // Tag styles matched to Chronos aesthetics
    const STAKES_COLORS = {
        high: "bg-red-500/10 text-red-400 border-red-500/20",
        medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        low: "bg-blue-500/10 text-blue-400 border-blue-500/20"
    };

    return (
        <div className={cn(
            "group relative p-5 flex flex-col justify-between rounded-2xl border transition-all duration-300 cursor-default overflow-hidden font-mono",
            isReviewed
                ? "h-auto min-h-[220px] bg-black border-white/10 opacity-70 hover:opacity-100"
                : "h-auto min-h-[220px] bg-black border-white/10 hover:border-white/20 hover:bg-[#09090b] hover:shadow-2xl"
        )}>
            {/* Header */}
            <div className="z-10 mb-4">
                <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-sm font-bold leading-relaxed text-zinc-200 group-hover:text-white transition-colors line-clamp-2">
                        {d.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Stakes Tag */}
                    <span className={cn(
                        "text-[9px] px-2 py-1 rounded-md border uppercase tracking-wider font-bold",
                        STAKES_COLORS[d.stakes] || STAKES_COLORS.low
                    )}>
                        {d.stakes}
                    </span>

                    {/* Reversibility Tag */}
                    <span className="text-[9px] text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 uppercase tracking-wider font-bold">
                        {d.reversibility}
                    </span>

                    {/* Confidence (Integrated) */}
                    <span className="text-[9px] text-zinc-600 bg-white/5 px-2 py-1 rounded-md border border-white/5 uppercase tracking-wider font-bold">
                        {d.confidence}% Conf
                    </span>
                </div>
            </div>

            {/* Assumptions */}
            <div className="flex-1 relative overflow-hidden z-10 mb-4">
                {assumptions.length > 0 ? (
                    <div className="space-y-1.5 pl-3 border-l-2 border-white/5 group-hover:border-white/10 transition-colors">
                        {assumptions.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-[10px] text-zinc-500 leading-relaxed truncate">• {a}</div>
                        ))}
                        {assumptions.length > 3 && <div className="text-[10px] text-zinc-600 italic">+{assumptions.length - 3} more</div>}
                    </div>
                ) : (
                    <div className="text-[10px] text-zinc-700 italic">No assumptions recorded</div>
                )}
            </div>

            {/* Outcome (reviewed only) */}
            {isReviewed && d.outcome && (
                <div className="bg-white/5 border-t border-white/5 -mx-5 -mb-5 px-5 py-4 mt-2">
                    <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Outcome</div>
                    <div className="text-zinc-400 text-[10px] leading-relaxed line-clamp-3">{d.outcome}</div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-3 z-10 border-t border-white/5">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                    {dateStr}
                </span>

                <div className="flex items-center gap-2">
                    {isReviewed ? (
                        <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
                            d.outcomeStatus === 'success' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' :
                                d.outcomeStatus === 'failure' ? 'border-red-500/20 text-red-400 bg-red-500/10' :
                                    'border-yellow-500/20 text-yellow-400 bg-yellow-500/10'
                        )}>
                            {d.outcomeStatus}
                        </span>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReview?.(d.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                        >
                            Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───

export default function LedgerPage({ ledger = [], setLedger }) {
    const [isCreating, setIsCreating] = useState(false);
    const [reviewingId, setReviewingId] = useState(null);
    const [sort, setSort] = useState("recent");
    const [showSettings, setShowSettings] = useState(false);

    const addDecision = useCallback((data) => {
        const newDecision = {
            id: uid(),
            createdAt: isoNow(),
            status: "open",
            ...data
        };
        setLedger(prev => [newDecision, ...prev]);
        setIsCreating(false);
    }, [setLedger]);

    const completeReview = useCallback((result) => {
        setLedger(prev => prev.map(d =>
            d.id === reviewingId
                ? { ...d, status: "reviewed", reviewedAt: isoNow(), outcome: result.outcome, outcomeStatus: result.status }
                : d
        ));
        setReviewingId(null);
    }, [setLedger, reviewingId]);

    const deleteAll = useCallback(() => {
        if (window.confirm(`Delete all ${ledger.length} decisions?`)) {
            setLedger([]);
        }
    }, [setLedger, ledger.length]);

    const openDecisions = useMemo(() => {
        let arr = ledger.filter(d => d.status === "open");
        if (sort === "az") arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        else arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return arr;
    }, [ledger, sort]);

    const reviewedDecisions = useMemo(() => {
        let arr = ledger.filter(d => d.status === "reviewed");
        if (sort === "az") arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        else arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return arr;
    }, [ledger, sort]);

    return (
        <div className="h-full w-full relative bg-black font-mono text-zinc-200 overflow-y-auto custom-scrollbar">
            <div className="w-full px-6 md:px-8 py-8 flex flex-col gap-8">

                {/* Header (Aligned with Codex) */}
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-white/5 pt-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Ledger</span>
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-500 font-mono">
                            {ledger.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                        >
                            <Plus size={14} strokeWidth={3} />
                            <span className="text-xs font-bold uppercase tracking-wide">New</span>
                        </button>

                        <button
                            onClick={() => setSort(s => s === 'recent' ? 'az' : 'recent')}
                            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 font-mono transition-colors flex items-center gap-2"
                        >
                            {sort === 'recent' ? 'RECENT' : 'A-Z'}
                            <ListFilter size={14} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "h-8 w-8 flex items-center justify-center rounded-lg transition-colors border",
                                    showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Settings size={16} />
                            </button>
                            {showSettings && (
                                <div className={cn(POPOVER_CLASS, "absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden py-1")}>
                                    <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-600 font-bold border-b border-white/5 mb-1 font-mono">
                                        Actions
                                    </div>
                                    {ledger.length > 0 && (
                                        <button
                                            onClick={() => { deleteAll(); setShowSettings(false); }}
                                            className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-red-400 group transition-colors"
                                        >
                                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-mono">Delete All</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 min-h-0 px-6 md:px-8">
                {/* Removed "Open Loops" label to reduce clutter as requested */}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-12">
                    {/* Empty State */}
                    {ledger.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-600 opacity-50 select-none">
                            <Scale size={40} className="mb-4 opacity-20" />
                            <p className="text-sm font-light uppercase tracking-widest font-mono">No decisions recorded</p>
                        </div>
                    )}

                    {/* Open Decisions first */}
                    {openDecisions.map(d => (
                        <DecisionCard key={d.id} d={d} onReview={setReviewingId} />
                    ))}

                    {/* Reviewed Decisions second (with opacity) */}
                    {reviewedDecisions.map(d => (
                        <DecisionCard key={d.id} d={d} />
                    ))}
                </div>

                <div className="h-24" />
            </div>

            {isCreating && <NewDecisionModal onClose={() => setIsCreating(false)} onSubmit={addDecision} />}
            {reviewingId && (
                <ReviewModal
                    decision={ledger.find(d => d.id === reviewingId)}
                    onClose={() => setReviewingId(null)}
                    onReview={completeReview}
                />
            )}
        </div>
    );
}

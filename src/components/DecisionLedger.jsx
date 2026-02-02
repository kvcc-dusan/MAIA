import React, { useState } from "react";
import { uid, isoNow } from "../lib/ids.js";

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
        <div
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-xl sm:rounded-xl p-6 shadow-2xl pb-12 sm:pb-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Handle */}
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden" />

                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Log New Decision
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1.5">Decision</label>
                        <input
                            autoFocus
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:border-zinc-600 outline-none"
                            placeholder="e.g. Migration to Postgres"
                            value={draft.title}
                            onChange={e => setDraft({ ...draft, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5">Stakes</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-zinc-300 outline-none"
                                value={draft.stakes}
                                onChange={e => setDraft({ ...draft, stakes: e.target.value })}
                            >
                                <option value="low">Low Stakes</option>
                                <option value="medium">Medium Stakes</option>
                                <option value="high">High Stakes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-zinc-500 mb-1.5">Reversibility</label>
                            <select
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-zinc-300 outline-none"
                                value={draft.reversibility}
                                onChange={e => setDraft({ ...draft, reversibility: e.target.value })}
                            >
                                <option value="reversible">Reversible</option>
                                <option value="costly">Costly to Reverse</option>
                                <option value="irreversible">Irreversible</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1.5">Key Assumptions (One per line)</label>
                        <textarea
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-zinc-300 focus:border-zinc-600 outline-none min-h-[100px]"
                            placeholder="- Usage will stick below 1k DAU&#10;- AWS cost won't exceed $50"
                            value={draft.assumptions}
                            onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1.5">Confidence ({draft.confidence}%)</label>
                        <input
                            type="range"
                            min="0" max="100" step="5"
                            className="w-full accent-blue-500 cursor-pointer"
                            value={draft.confidence}
                            onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-zinc-100 text-black font-medium rounded-md hover:bg-white transition-colors">Log Decision</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success"); // success, failure, mixed

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-xl sm:rounded-xl p-6 shadow-2xl pb-12 sm:pb-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Handle */}
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden" />

                <h2 className="text-lg font-semibold mb-6">Review Decision Outcome</h2>
                <div className="mb-6 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="text-zinc-400 text-xs uppercase mb-1">Decision</div>
                    <div className="text-zinc-200">{decision.title}</div>
                    <div className="text-zinc-500 text-xs mt-2">Assumptions:</div>
                    <ul className="list-disc list-inside text-zinc-400 text-sm">
                        {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1.5">Actual Outcome</label>
                        <textarea
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-zinc-300 focus:border-zinc-600 outline-none min-h-[100px]"
                            autoFocus
                            value={outcome}
                            onChange={e => setOutcome(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1.5">Result Assessment</label>
                        <div className="flex bg-zinc-900 rounded-md border border-zinc-800 p-1">
                            {['success', 'mixed', 'failure'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`flex-1 capitalize text-sm py-1.5 rounded-sm transition-colors ${status === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-zinc-900">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancel</button>
                        <button
                            onClick={() => onReview({ outcome, status })}
                            className="px-4 py-2 bg-zinc-100 text-black font-medium rounded-md hover:bg-white transition-colors"
                        >
                            Complete Review
                        </button>
                    </div>
                </div>
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
        <div key={d.id} className="border border-zinc-800/60 bg-zinc-950/30 rounded-lg p-4 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="text-zinc-200 font-medium">{d.title}</div>
                    <div className="text-zinc-500 text-xs mt-1 flex gap-3">
                        <span className="capitalize text-zinc-400">{d.stakes} Stakes</span>
                        <span className="capitalize">{d.reversibility}</span>
                        <span>Conf: {d.confidence}%</span>
                    </div>
                </div>
                {d.status === "open" && (
                    <button
                        onClick={() => setReviewingId(d.id)}
                        className="text-xs border border-zinc-800 px-2 py-1 rounded text-zinc-400 hover:text-white hover:border-zinc-600"
                    >
                        Review Outcome
                    </button>
                )}
                {d.status === "reviewed" && (
                    <div className={`text-xs px-2 py-0.5 rounded border capitalize ${d.outcomeStatus === 'success' ? 'border-green-900 text-green-500' :
                        d.outcomeStatus === 'failure' ? 'border-red-900 text-red-500' :
                            'border-yellow-900 text-yellow-500'
                        }`}>
                        {d.outcomeStatus}
                    </div>
                )}
            </div>

            {/* Assumptions */}
            <div className="mt-3 space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-zinc-600">Assumptions</div>
                <ul className="list-disc list-inside text-zinc-400 text-sm">
                    {d.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
            </div>

            {/* Outcome View */}
            {d.status === "reviewed" && (
                <div className="mt-4 pt-3 border-t border-zinc-900/50">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">Outcome</div>
                    <div className="text-zinc-300 text-sm whitespace-pre-wrap">{d.outcome}</div>
                </div>
            )}

            <div className="mt-3 text-[10px] text-zinc-600 text-right">
                {new Date(d.createdAt).toLocaleDateString()}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col w-full">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-mono text-zinc-100">Decision Ledger</h2>
                    <p className="text-zinc-500 text-sm mt-1">Track strategic choices and calibrate intuition.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-3 py-1.5 bg-zinc-800 text-zinc-200 text-xs uppercase tracking-wider font-bold rounded hover:bg-zinc-700 transition-colors"
                >
                    + Log Decision
                </button>
            </header>

            <div className="flex-1 overflow-y-auto space-y-8 min-h-0 pb-12 custom-scrollbar pr-2">
                {/* Active Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Open Loops ({openDecisions.length})</h3>
                    </div>
                    <div className="grid gap-4">
                        {openDecisions.length === 0 && <div className="text-zinc-700 italic text-sm">No open decisions.</div>}
                        {openDecisions.map(d => <DecisionCard key={d.id} d={d} />)}
                    </div>
                </section>

                {/* Reviewed Section */}
                {reviewedDecisions.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Closed & Reviewed ({reviewedDecisions.length})</h3>
                        </div>
                        <div className="grid gap-4 opacity-75">
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

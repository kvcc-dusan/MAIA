import React, { useState } from "react";
import { uid, isoNow } from "../lib/ids.js";
import ProjectIcon from "./ProjectIcon";
import DecisionCard from "./DecisionCard";
import NewDecisionModal from "./NewDecisionModal";
import ReviewModal from "./ReviewModal";

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
                        {openDecisions.map(d => <DecisionCard key={d.id} d={d} onReviewStart={setReviewingId} />)}
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
                            {reviewedDecisions.map(d => <DecisionCard key={d.id} d={d} onReviewStart={setReviewingId} />)}
                        </div>
                    </section>
                )}
            </div>

            {isCreating && <NewDecisionModal onClose={() => setIsCreating(false)} onSubmit={addDecision} />}
            {reviewingId && <ReviewModal decision={ledger.find(d => d.id === reviewingId)} onClose={() => setReviewingId(null)} onReview={completeReview} />}

        </div>
    );
}

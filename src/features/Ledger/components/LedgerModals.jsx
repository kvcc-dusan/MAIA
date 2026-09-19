import { useState } from "react";
import { cn } from "@/lib/utils";
import { BalanceScale as Scale } from "@/components/ui/CustomIcon.jsx";
import { AppDialog } from "@/components/composed/AppDialog";
import { STAKES_DOT, OUTCOME_DOT, INPUT_CLEAN, LABEL_CLASS } from "./decisionStyles";

/**
 * The three Ledger decision dialogs — create/edit, outcome review, and the
 * read-only detail view. Extracted verbatim from LedgerPage.jsx; the only
 * changes are token lifts (accent-white / text-white) so the dialogs stop
 * carrying literal colours.
 */

// ─── New / Edit Decision Modal ───

export function NewDecisionModal({ onClose, onSubmit, initialData }) {
    const isEditing = !!initialData;
    const [draft, setDraft] = useState({
        title: initialData?.title || "",
        stakes: initialData?.stakes || "medium",
        reversibility: initialData?.reversibility || "irreversible",
        assumptions: Array.isArray(initialData?.assumptions) ? initialData.assumptions.join('\n') : (initialData?.assumptions || ""),
        confidence: initialData?.confidence ?? 70,
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
        <AppDialog
            open
            onClose={onClose}
            size="lg"
            title={
                <span className="flex items-center gap-2">
                    <Scale size={14} className="text-muted-foreground" />
                    {isEditing ? "Edit Decision" : "Log Decision"}
                </span>
            }
        >

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <input
                            autoFocus
                            placeholder="Decision Title..."
                            value={draft.title}
                            onChange={e => setDraft({ ...draft, title: e.target.value })}
                            className={cn(INPUT_CLEAN, "text-lg font-medium placeholder:text-faint-foreground")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={LABEL_CLASS}>Stakes</label>
                            <div className="flex gap-1">
                                {['low', 'medium', 'high'].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, stakes: s })}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                            draft.stakes === s
                                                ? (s === 'high' ? 'bg-destructive/10 text-destructive' : s === 'medium' ? 'bg-warning/10 text-warning' : 'bg-priority-1/10 text-priority-1')
                                                : 'text-subtle-foreground hover:text-muted-foreground hover:bg-overlay-subtle'
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
                                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                            draft.reversibility === r
                                                ? 'bg-overlay text-foreground'
                                                : 'text-subtle-foreground hover:text-muted-foreground hover:bg-overlay-subtle'
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
                            <span className="text-xs text-muted-foreground tabular-nums">{draft.confidence}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="100" step="5"
                            className="w-full h-1 bg-overlay-subtle rounded-lg appearance-none cursor-pointer accent-foreground hover:bg-overlay transition-colors"
                            value={draft.confidence}
                            onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground-secondary transition-colors">Cancel</button>
                        <button type="submit" className="text-xs font-bold uppercase tracking-wider text-foreground hover:text-foreground-secondary transition-colors">
                            {isEditing ? "Save Changes" : "Log Decision"}
                        </button>
                    </div>
                </form>
        </AppDialog>
    );
}

// ─── Review Modal ───

export function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success");

    if (!decision) return null;

    return (
        <AppDialog open onClose={onClose} size="lg" title="Review Outcome">

                <div className="space-y-6">
                    {/* Decision Summary */}
                    <div>
                        <div className="text-lg font-medium text-foreground mb-3">{decision.title}</div>
                        {/* Confidence prediction — core of calibration */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-subtle-foreground uppercase tracking-widest">You predicted</span>
                            <span className="text-sm font-bold text-foreground">{decision.confidence}%</span>
                            <span className="text-xs text-subtle-foreground uppercase tracking-widest">confidence</span>
                        </div>
                        {decision.assumptions && decision.assumptions.length > 0 && (
                            <div className="space-y-1 pl-3 border-l-2 border-border-subtle">
                                {decision.assumptions.map((a, i) => (
                                    <div key={i} className="text-xs text-muted-foreground leading-relaxed">• {a}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
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
                                        "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                        status === s
                                            ? (s === 'success' ? 'bg-success/10 text-success' : s === 'failure' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')
                                            : 'text-subtle-foreground hover:text-muted-foreground hover:bg-overlay-subtle'
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground-secondary transition-colors">Cancel</button>
                        <button
                            onClick={() => onReview({ outcome, status })}
                            className="text-xs font-bold uppercase tracking-wider text-foreground hover:text-foreground-secondary transition-colors"
                        >
                            Complete Review
                        </button>
                    </div>
                </div>
        </AppDialog>
    );
}

// ─── Decision Detail Modal (Read-Only) ───

export function DecisionDetailModal({ decision, onClose }) {
    if (!decision) return null;

    return (
        <AppDialog open onClose={onClose} size="lg" title="Decision Review">

                <div className="space-y-6">
                    {/* Decision Title & Tags */}
                    <div>
                        <div className="text-lg font-medium text-foreground mb-3">{decision.title}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAKES_DOT[decision.stakes] || STAKES_DOT.low }} />
                                {decision.stakes}
                            </span>
                            <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold">
                                {decision.reversibility}
                            </span>
                            <span className="text-xs text-subtle-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold">
                                {decision.confidence}% Conf
                            </span>
                        </div>
                    </div>

                    {/* Assumptions */}
                    {decision.assumptions && decision.assumptions.length > 0 && (
                        <div className="pt-4 border-t border-border-subtle">
                            <div className={LABEL_CLASS}>Assumptions</div>
                            <div className="space-y-1.5 pl-3 border-l-2 border-border">
                                {decision.assumptions.map((a, i) => (
                                    <div key={i} className="text-xs text-muted-foreground leading-relaxed">• {a}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Outcome */}
                    {decision.outcome && (
                        <div className="pt-4 border-t border-border-subtle">
                            <div className={LABEL_CLASS}>Actual Outcome</div>
                            <div className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">{decision.outcome}</div>
                        </div>
                    )}

                    {/* Result Assessment */}
                    {decision.outcomeStatus && (
                        <div className="pt-4 border-t border-border-subtle">
                            <div className={LABEL_CLASS}>Result Assessment</div>
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-border-subtle bg-overlay-subtle text-muted-foreground inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: OUTCOME_DOT[decision.outcomeStatus] }} />
                                {decision.outcomeStatus}
                            </span>
                        </div>
                    )}

                    {/* Reviewed Date */}
                    {decision.reviewedAt && (
                        <div className="text-xs text-subtle-foreground uppercase tracking-wider pt-2">
                            Reviewed {new Date(decision.reviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    )}
                </div>
        </AppDialog>
    );
}

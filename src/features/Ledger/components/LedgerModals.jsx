import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { BalanceScale as Scale } from "@/components/ui/CustomIcon.jsx";
import { AppDialog } from "@/components/composed/AppDialog";
import { Field } from "@/components/composed/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STAKES_DOT, OUTCOME_DOT } from "./decisionStyles";

/**
 * The three Ledger decision dialogs — create/edit, outcome review, and the
 * read-only detail view.
 *
 * Rebuilt on the shared form primitives the same way as ChronosModal's task
 * form: fields whose placeholder speaks carry an sr-only label, controls that
 * display their value (chip groups, the confidence slider) keep a visible
 * one, and an empty title now surfaces as error text under the field instead
 * of silently no-op'ing the submit. These are centered dialogs rather than
 * slide-over rails, so EntityForm's chrome (full-height, slide-in, own h2)
 * doesn't apply — the AppDialog + Field + Button composition below is the
 * same one PromptDialog uses, with the action row in AppDialog's footer slot
 * (Cancel bordered, left of the primary action).
 */

// The stakes / reversibility / result pickers are chip toggles, not action
// buttons — the Button primitive supplies the interaction chrome (focus ring,
// pressed state, disabled handling) while the chip look stays a className
// override. Selected chips restate their tint as their own hover colour, so
// ghost's hover styles can't repaint a value the user already picked.
function chipClasses(selected, selectedClasses) {
    return cn(
        "rounded-lg text-xs font-bold uppercase tracking-wider",
        selected ? selectedClasses : "text-subtle-foreground hover:text-muted-foreground hover:bg-overlay-subtle"
    );
}

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
    const [error, setError] = useState(null);
    const confidenceId = useId();

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!draft.title.trim()) {
            setError("Give the decision a title.");
            return;
        }
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
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>{isEditing ? "Save Changes" : "Log Decision"}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-8">
                <Field label="Title" labelClassName="sr-only" required error={error}>
                    <Input
                        autoFocus
                        placeholder="Decision Title..."
                        value={draft.title}
                        onChange={e => setDraft({ ...draft, title: e.target.value })}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-8">
                    <Field label="Stakes">
                        <div className="flex gap-1">
                            {['low', 'medium', 'high'].map(s => (
                                <Button
                                    key={s}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={draft.stakes === s}
                                    onClick={() => setDraft({ ...draft, stakes: s })}
                                    className={chipClasses(draft.stakes === s, s === 'high'
                                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/10 hover:text-destructive'
                                        : s === 'medium'
                                            ? 'bg-warning/10 text-warning hover:bg-warning/10 hover:text-warning'
                                            : 'bg-priority-1/10 text-priority-1 hover:bg-priority-1/10 hover:text-priority-1')}
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Reversibility">
                        <div className="flex gap-1">
                            {['reversible', 'costly', 'irreversible'].map(r => (
                                <Button
                                    key={r}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={draft.reversibility === r}
                                    onClick={() => setDraft({ ...draft, reversibility: r })}
                                    className={chipClasses(draft.reversibility === r, 'bg-overlay text-foreground hover:bg-overlay hover:text-foreground')}
                                >
                                    {r === 'irreversible' ? 'Final' : r}
                                </Button>
                            ))}
                        </div>
                    </Field>
                </div>

                <Field label="Key Assumptions" labelClassName="sr-only">
                    <Textarea
                        className="min-h-[80px] leading-relaxed"
                        placeholder={"- Zero downtime required\n- Cost under $50/mo"}
                        value={draft.assumptions}
                        onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                    />
                </Field>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor={confidenceId}>Confidence</Label>
                        <span className="text-xs text-muted-foreground tabular-nums">{draft.confidence}%</span>
                    </div>
                    {/* A range slider is its own control family — the h-11 input
                        chrome doesn't apply, so this stays a raw control wired to
                        its label by hand. */}
                    <input
                        id={confidenceId}
                        type="range"
                        min="0" max="100" step="5"
                        className="w-full h-1 bg-overlay-subtle rounded-lg appearance-none cursor-pointer accent-foreground hover:bg-overlay transition-colors"
                        value={draft.confidence}
                        onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                    />
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
        <AppDialog
            open
            onClose={onClose}
            size="lg"
            title="Review Outcome"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onReview({ outcome, status })}>Complete Review</Button>
                </>
            }
        >
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
                    <Field label="Actual Outcome" labelClassName="sr-only">
                        <Textarea
                            autoFocus
                            className="min-h-[80px] leading-relaxed"
                            placeholder="What actually happened..."
                            value={outcome}
                            onChange={e => setOutcome(e.target.value)}
                        />
                    </Field>
                </div>

                <Field label="Result Assessment">
                    <div className="flex gap-2">
                        {['success', 'mixed', 'failure'].map(s => (
                            <Button
                                key={s}
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-pressed={status === s}
                                onClick={() => setStatus(s)}
                                className={cn(chipClasses(status === s, s === 'success'
                                    ? 'bg-success/10 text-success hover:bg-success/10 hover:text-success'
                                    : s === 'failure'
                                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/10 hover:text-destructive'
                                        : 'bg-warning/10 text-warning hover:bg-warning/10 hover:text-warning'), "px-4")}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                </Field>
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
                        {/* Read-only section headings, not form labels — Field doesn't apply */}
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle-foreground mb-3">Assumptions</div>
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
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle-foreground mb-3">Actual Outcome</div>
                        <div className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">{decision.outcome}</div>
                    </div>
                )}

                {/* Result Assessment */}
                {decision.outcomeStatus && (
                    <div className="pt-4 border-t border-border-subtle">
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle-foreground mb-3">Result Assessment</div>
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

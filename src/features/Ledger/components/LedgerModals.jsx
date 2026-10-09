import { useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { Slider } from "@/components/arc/slider/slider";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { STAKES_DOT, OUTCOME_DOT, STAKES_LABEL, REVERSIBILITY_LABEL, OUTCOME_LABEL } from "./decisionStyles";
import { StatusDotLabel } from "./StatusDotLabel";
import styles from "./LedgerModals.module.css";

/**
 * The three Ledger decision dialogs: create/edit, outcome review, and the
 * read-only detail view. AppDialog + Arc fields; the action row sits in
 * AppDialog's footer slot (Cancel left of the primary action).
 *
 * Stakes, reversibility and result are single-choice pickers, so they are
 * segmented controls. Stakes and result carry a status dot as an accessory;
 * the label always states the value.
 */

const dot = (color) => <span className={styles.dot} style={{ backgroundColor: color }} aria-hidden="true" />;

const STAKES_OPTIONS = ['low', 'medium', 'high'].map((value) => ({
    value,
    label: STAKES_LABEL[value],
    accessory: dot(STAKES_DOT[value]),
}));

const REVERSIBILITY_OPTIONS = ['reversible', 'costly', 'irreversible'].map((value) => ({
    value,
    label: REVERSIBILITY_LABEL[value],
}));

const RESULT_OPTIONS = ['success', 'mixed', 'failure'].map((value) => ({
    value,
    label: OUTCOME_LABEL[value],
    accessory: dot(OUTCOME_DOT[value]),
}));

const formatPercent = (value) => `${value}%`;

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
            title={isEditing ? "Edit decision" : "Log decision"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSubmit}>{isEditing ? "Save changes" : "Log decision"}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <Input
                    autoFocus
                    label="Title"
                    placeholder="Move the site to a new host"
                    aria-required="true"
                    value={draft.title}
                    error={error || undefined}
                    onChange={e => {
                        setDraft({ ...draft, title: e.target.value });
                        if (error) setError(null);
                    }}
                />

                <div className={styles.pair}>
                    <div className={styles.group}>
                        <span className={styles.groupLabel}>Stakes</span>
                        <SegmentedControl
                            label="Stakes"
                            options={STAKES_OPTIONS}
                            value={draft.stakes}
                            onValueChange={(stakes) => setDraft({ ...draft, stakes })}
                        />
                    </div>
                    <div className={styles.group}>
                        <span className={styles.groupLabel}>Reversibility</span>
                        <SegmentedControl
                            label="Reversibility"
                            options={REVERSIBILITY_OPTIONS}
                            value={draft.reversibility}
                            onValueChange={(reversibility) => setDraft({ ...draft, reversibility })}
                        />
                    </div>
                </div>

                <Textarea
                    label="Key assumptions"
                    description="One per line."
                    rows={4}
                    placeholder={"Zero downtime required\nCost under $50 a month"}
                    value={draft.assumptions}
                    onChange={e => setDraft({ ...draft, assumptions: e.target.value })}
                />

                <Slider
                    label="Confidence"
                    min={0}
                    max={100}
                    step={5}
                    format={formatPercent}
                    value={draft.confidence}
                    onValueChange={(confidence) => setDraft({ ...draft, confidence })}
                />
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
            title="Review outcome"
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={() => onReview({ outcome, status })}>Complete review</Button>
                </>
            }
        >
            <div className={styles.stack}>
                <div>
                    <div className={styles.decisionTitle}>{decision.title}</div>
                    {/* The confidence prediction is the core of calibration */}
                    <p className={styles.predicted}>
                        You predicted <strong>{decision.confidence}%</strong> confidence
                    </p>
                    {decision.assumptions && decision.assumptions.length > 0 && (
                        <ul className={styles.assumptions}>
                            {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    )}
                </div>

                <div className={styles.section}>
                    <Textarea
                        autoFocus
                        label="Actual outcome"
                        rows={4}
                        placeholder="What actually happened"
                        value={outcome}
                        onChange={e => setOutcome(e.target.value)}
                    />
                </div>

                <div className={styles.group}>
                    <span className={styles.groupLabel}>Result</span>
                    <SegmentedControl
                        label="Result"
                        options={RESULT_OPTIONS}
                        value={status}
                        onValueChange={setStatus}
                    />
                </div>
            </div>
        </AppDialog>
    );
}

// ─── Decision Detail Modal (Read-Only) ───

export function DecisionDetailModal({ decision, onClose }) {
    if (!decision) return null;

    return (
        <AppDialog open onClose={onClose} size="lg" title="Decision review">
            <div className={styles.stack}>
                <div>
                    <div className={styles.decisionTitle}>{decision.title}</div>
                    <div className={styles.chips}>
                        <StatusDotLabel dot={STAKES_DOT[decision.stakes] || STAKES_DOT.low}>
                            {STAKES_LABEL[decision.stakes] || STAKES_LABEL.low} stakes
                        </StatusDotLabel>
                        <StatusDotLabel>{REVERSIBILITY_LABEL[decision.reversibility] || decision.reversibility}</StatusDotLabel>
                        <StatusDotLabel>{decision.confidence}% confident</StatusDotLabel>
                    </div>
                </div>

                {decision.assumptions && decision.assumptions.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionLabel}>Assumptions</h3>
                        <ul className={styles.assumptions}>
                            {decision.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </div>
                )}

                {decision.outcome && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionLabel}>Actual outcome</h3>
                        <p className={styles.outcome}>{decision.outcome}</p>
                    </div>
                )}

                {decision.outcomeStatus && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionLabel}>Result</h3>
                        <StatusDotLabel dot={OUTCOME_DOT[decision.outcomeStatus]}>
                            {OUTCOME_LABEL[decision.outcomeStatus] || decision.outcomeStatus}
                        </StatusDotLabel>
                    </div>
                )}

                {decision.reviewedAt && (
                    <p className={styles.reviewed}>
                        Reviewed {new Date(decision.reviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                )}
            </div>
        </AppDialog>
    );
}

import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { STAKES_DOT, OUTCOME_DOT, STAKES_LABEL, REVERSIBILITY_LABEL, OUTCOME_LABEL } from "./decisionStyles";
import { StatusDotLabel } from "./StatusDotLabel";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import styles from "./DecisionCard.module.css";

/**
 * One decision in the card grid, plus the section divider that heads the
 * Open / Reviewed groups. A bordered card (no shadow, no blur); the whole card
 * is one button, so it carries a full accessible name.
 */

export function DecisionCard({ d, onReview, onView, isSelected, selectMode, onToggle, onContextMenu, isPinned }) {
    const longPress = useLongPress((touch) => {
        onContextMenu({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { } }, d.id);
    });
    const dateObj = new Date(d.createdAt);
    const now = new Date();
    const isToday = dateObj.getDate() === now.getDate() && dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    const dateStr = isToday ? "Today" : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const isReviewed = d.status === "reviewed";
    const assumptions = d.assumptions || [];

    // Shared by click and keyboard activation so Enter/Space match the mouse
    // contract exactly (select-mode toggle, otherwise review vs. view).
    const activate = () => {
        if (selectMode) {
            onToggle(d.id);
        } else if (isReviewed) {
            onView?.(d.id);
        } else {
            onReview?.(d.id);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            activate();
        }
    };

    const action = selectMode
        ? `${isSelected ? "Deselect" : "Select"} ${d.title}`
        : `${d.title}: ${isReviewed ? "view decision" : "review decision"}`;
    const activationLabel = isPinned ? `${action} (pinned)` : action;

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={activationLabel}
            aria-pressed={selectMode ? isSelected : undefined}
            onClick={(e) => {
                e.stopPropagation();
                activate();
            }}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => onContextMenu(e, d.id)}
            onTouchStart={longPress.onTouchStart}
            onTouchMove={longPress.onTouchMove}
            onTouchEnd={longPress.onTouchEnd}
            className={cn(styles.card, isSelected && styles.selected, isReviewed && styles.reviewed)}
        >
            {isPinned && !isSelected && <span className={styles.pinDot} aria-hidden="true" />}

            {isSelected && (
                <span className={styles.check} aria-hidden="true">
                    <svg width="8" height="8" viewBox="0 0 10 10">
                        <polyline points="1,5 4,8 9,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            )}

            <div className={styles.head}>
                <h3 className={styles.title}>{d.title}</h3>
                <div className={styles.chips}>
                    <StatusDotLabel dot={STAKES_DOT[d.stakes] || STAKES_DOT.low}>
                        {STAKES_LABEL[d.stakes] || STAKES_LABEL.low} stakes
                    </StatusDotLabel>
                    <StatusDotLabel>{REVERSIBILITY_LABEL[d.reversibility] || d.reversibility}</StatusDotLabel>
                    <StatusDotLabel>{d.confidence}% confident</StatusDotLabel>
                </div>
            </div>

            {/* Each assumption clamps to one row, capped at 3 with a "+N more"
                line so every card in a row reserves the same block height. */}
            <div className={styles.assumptions}>
                {assumptions.length > 0 ? (
                    <ul className={styles.assumptionList}>
                        {assumptions.slice(0, 3).map((a, i) => (
                            <li key={i} className={styles.assumption}>{a}</li>
                        ))}
                        {assumptions.length > 3 && <li className={styles.more}>+{assumptions.length - 3} more</li>}
                    </ul>
                ) : (
                    <p className={styles.none}>No assumptions recorded</p>
                )}
            </div>

            {isReviewed && d.outcome && (
                <div className={styles.outcome}>
                    <div className={styles.outcomeLabel}>Outcome</div>
                    <p className={styles.outcomeText}>{d.outcome}</p>
                </div>
            )}

            <div className={styles.footer}>
                <span className={styles.date}>{dateStr}</span>
                {isReviewed ? (
                    <StatusDotLabel dot={OUTCOME_DOT[d.outcomeStatus]}>
                        {OUTCOME_LABEL[d.outcomeStatus] || d.outcomeStatus}
                    </StatusDotLabel>
                ) : (
                    // Persistent dim "awaiting review" cue; brightens on hover.
                    <span className={cn(styles.reviewCue, selectMode && styles.hidden)}>Review</span>
                )}
            </div>
        </div>
    );
}

export function SectionDivider({ label, count }) {
    return (
        <div className={styles.divider}>
            <SectionLabel as="h3">{label}</SectionLabel>
            <CountPill>{count}</CountPill>
            <div className={styles.rule} />
        </div>
    );
}

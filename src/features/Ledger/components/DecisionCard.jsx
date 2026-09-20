import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { STAKES_DOT, OUTCOME_DOT } from "./decisionStyles";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";

/**
 * One decision in the card grid, plus the section divider that heads the
 * Open / Reviewed groups. Extracted from LedgerPage.jsx; markup is unchanged
 * apart from lifting the literal white/black styling onto tokens.
 */

export function DecisionCard({ d, onReview, onView, isSelected, selectMode, onToggle, onContextMenu, isPinned }) {
    const longPress = useLongPress((touch) => {
        onContextMenu({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { } }, d.id);
    });
    const dateObj = new Date(d.createdAt);
    const now = new Date();
    const isToday = dateObj.getDate() === now.getDate() && dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    const dateStr = isToday ? "TODAY" : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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

    const activationLabel = selectMode
        ? `${isSelected ? "Deselect" : "Select"} ${d.title}`
        : `${d.title} — ${isReviewed ? "view decision" : "review decision"}`;

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
            className={cn(
                "group relative p-4 flex flex-col justify-between rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xs",
                "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                isSelected
                    ? "bg-overlay border-border-strong ring-1 ring-overlay-strong"
                    : isReviewed
                        ? "h-auto min-h-[200px] bg-overlay-subtle border-border-subtle opacity-70 hover:opacity-100 hover:bg-overlay hover:border-border"
                        : "h-auto min-h-[200px] bg-overlay-subtle border-border-subtle hover:bg-overlay hover:border-border"
            )}
        >
            {/* Pinned indicator — literal white dot, only shown when pinned (matches Codex);
                --pure is the token system's sanctioned escape hatch for exactly this */}
            {isPinned && !isSelected && (
                <div className="absolute top-4 right-4 z-20 w-2 h-2 rounded-full bg-pure" />
            )}

            {/* Select mode checkmark circle */}
            {isSelected && (
                <div className="absolute top-4 right-4 z-20 w-3.5 h-3.5 rounded-full bg-pure border border-pure flex items-center justify-center">
                    <svg width="7" height="7" viewBox="0 0 10 10">
                        {/* Check drawn in the ground colour so it reads as a cutout of the dot */}
                        <polyline points="1,5 4,8 9,2" style={{ stroke: 'var(--background)' }} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Header */}
            <div className="z-10 mb-4">
                <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-sm font-bold leading-relaxed text-foreground group-hover:text-pure transition-colors line-clamp-2 pr-5">
                        {d.title}
                    </h3>
                </div>

                <div className="flex items-center gap-1.5 h-6 overflow-hidden">
                    <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-lg border border-border-subtle uppercase tracking-wider font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAKES_DOT[d.stakes] || STAKES_DOT.low }} />
                        {d.stakes}
                    </span>
                    <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-lg border border-border-subtle uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                        {d.reversibility}
                    </span>
                    <span className="text-xs text-subtle-foreground bg-overlay-subtle px-2 py-1 rounded-lg border border-border-subtle uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                        {d.confidence}% Conf
                    </span>
                </div>
            </div>

            {/* Assumptions — each line clamps to one row (no mid-word fade),
                capped at 3 with an explicit "+N more" affordance so every
                card in a row reserves the same fixed block height. */}
            <div className="flex-1 relative overflow-hidden z-10 mb-4">
                {assumptions.length > 0 ? (
                    <div className="space-y-1.5 pl-3 border-l-2 border-border-subtle group-hover:border-border transition-colors">
                        {assumptions.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-xs text-muted-foreground leading-relaxed line-clamp-1">• {a}</div>
                        ))}
                        {assumptions.length > 3 && <div className="text-xs text-subtle-foreground italic">+{assumptions.length - 3} more</div>}
                    </div>
                ) : (
                    <div className="text-xs text-faint-foreground italic">No assumptions recorded</div>
                )}
            </div>

            {/* Outcome (reviewed only) */}
            {isReviewed && d.outcome && (
                <div className="pt-4 mt-4">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Outcome</div>
                    <div className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{d.outcome}</div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-5 z-10">
                <span className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                    {dateStr}
                </span>

                <div className="flex items-center gap-2">
                    {isReviewed ? (
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-border-subtle bg-overlay-subtle text-muted-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: OUTCOME_DOT[d.outcomeStatus] }} />
                            {d.outcomeStatus}
                        </span>
                    ) : (
                        /* Persistent dim "awaiting review" — becomes bright on hover */
                        <span className={cn(
                            "text-xs font-bold uppercase tracking-wider transition-colors",
                            selectMode ? "opacity-0" : "text-faint-foreground group-hover:text-muted-foreground"
                        )}>
                            Review
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function SectionDivider({ label, count }) {
    return (
        <div className="col-span-full flex items-center gap-3 pt-2 pb-1">
            <SectionLabel className="tracking-widest">{label}</SectionLabel>
            <CountPill className="tabular-nums">{count}</CountPill>
            <div className="flex-1 h-px bg-overlay-subtle" />
        </div>
    );
}

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { cn } from "@/lib/utils";
import { PlusSignSquare as Plus, AiMagic as Sparkles, Settings01 as Settings, Delete01 as Trash2, BalanceScale as Scale, Pin, Pen01 as PenLine, Circle, Filter } from "../components/ui/CustomIcon.jsx";
import { JudgmentOverview } from "@/features/Ledger/components/JudgmentOverview";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useLongPress } from "../hooks/useLongPress";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { AppDialog } from "@/components/composed/AppDialog";

/* ──────────────────────────────────────────────────────────
   LedgerPage  –  Decision Journal & Cognitive Feedback Loop
   ────────────────────────────────────────────────────────── */

const POPOVER_CLASS = "bg-[#09090b] border border-border shadow-2xl rounded-2xl";
const INPUT_CLEAN = "w-full bg-transparent border-none outline-hidden text-foreground placeholder:text-faint-foreground/50 transition-all resize-none p-0 focus:ring-0";
const LABEL_CLASS = "text-xs font-bold uppercase tracking-widest text-subtle-foreground mb-3 block";

// Shared color tokens
const STAKES_DOT = { high: '#f43f5e', medium: '#f59e0b', low: '#6366f1' };
const OUTCOME_DOT = { success: '#10b981', mixed: '#f59e0b', failure: '#f43f5e' };

// ─── New / Edit Decision Modal ───

function NewDecisionModal({ onClose, onSubmit, initialData }) {
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
                            className={cn(INPUT_CLEAN, "text-xl font-medium placeholder:text-faint-foreground")}
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
                                                ? (s === 'high' ? 'bg-[#f43f5e]/10 text-[#f43f5e]' : s === 'medium' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#6366f1]/10 text-[#6366f1]')
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
                            className="w-full h-1 bg-overlay-subtle rounded-lg appearance-none cursor-pointer accent-white hover:bg-overlay transition-colors"
                            value={draft.confidence}
                            onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground-secondary transition-colors">Cancel</button>
                        <button type="submit" className="text-xs font-bold uppercase tracking-wider text-white hover:text-foreground-secondary transition-colors">
                            {isEditing ? "Save Changes" : "Log Decision"}
                        </button>
                    </div>
                </form>
        </AppDialog>
    );
}

// ─── Review Modal ───

function ReviewModal({ decision, onClose, onReview }) {
    const [outcome, setOutcome] = useState("");
    const [status, setStatus] = useState("success");

    if (!decision) return null;

    return (
        <AppDialog open onClose={onClose} size="lg" title="Review Outcome">

                <div className="space-y-6">
                    {/* Decision Summary */}
                    <div>
                        <div className="text-xl font-medium text-foreground mb-3">{decision.title}</div>
                        {/* Confidence prediction — core of calibration */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-subtle-foreground uppercase tracking-widest">You predicted</span>
                            <span className="text-sm font-bold text-white">{decision.confidence}%</span>
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
                                            ? (s === 'success' ? 'bg-[#10b981]/10 text-[#10b981]' : s === 'failure' ? 'bg-[#f43f5e]/10 text-[#f43f5e]' : 'bg-[#f59e0b]/10 text-[#f59e0b]')
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
                            className="text-xs font-bold uppercase tracking-wider text-white hover:text-foreground-secondary transition-colors"
                        >
                            Complete Review
                        </button>
                    </div>
                </div>
        </AppDialog>
    );
}

// ─── Decision Detail Modal (Read-Only) ───

function DecisionDetailModal({ decision, onClose }) {
    if (!decision) return null;

    return (
        <AppDialog open onClose={onClose} size="lg" title="Decision Review">

                <div className="space-y-6">
                    {/* Decision Title & Tags */}
                    <div>
                        <div className="text-xl font-medium text-foreground mb-3">{decision.title}</div>
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

// ─── Decision Card ───

function DecisionCard({ d, onReview, onView, isSelected, selectMode, onToggle, onContextMenu, isPinned }) {
    const longPress = useLongPress((touch) => {
        onContextMenu({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { } }, d.id);
    });
    const dateObj = new Date(d.createdAt);
    const now = new Date();
    const isToday = dateObj.getDate() === now.getDate() && dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    const dateStr = isToday ? "TODAY" : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const isReviewed = d.status === "reviewed";
    const assumptions = d.assumptions || [];

    return (
        <div
            onClick={(e) => {
                if (selectMode) {
                    onToggle(d.id);
                    e.stopPropagation();
                } else if (isReviewed) {
                    e.stopPropagation();
                    onView?.(d.id);
                } else {
                    e.stopPropagation();
                    onReview?.(d.id);
                }
            }}
            onContextMenu={(e) => onContextMenu(e, d.id)}
            onTouchStart={longPress.onTouchStart}
            onTouchMove={longPress.onTouchMove}
            onTouchEnd={longPress.onTouchEnd}
            className={cn(
                "group relative p-4 flex flex-col justify-between rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xs",
                isSelected
                    ? "bg-overlay border-border-strong ring-1 ring-overlay-strong"
                    : isReviewed
                        ? "h-auto min-h-[200px] bg-overlay-subtle border-border-subtle opacity-70 hover:opacity-100 hover:bg-overlay hover:border-border"
                        : "h-auto min-h-[200px] bg-overlay-subtle border-border-subtle hover:bg-overlay hover:border-border"
            )}
        >
            {/* Pinned indicator — white dot, only shown when pinned (matches Codex) */}
            {isPinned && !isSelected && (
                <div className="absolute top-4 right-4 z-20 w-2 h-2 rounded-full bg-white" />
            )}

            {/* Select mode checkmark circle */}
            {isSelected && (
                <div className="absolute top-4 right-4 z-20 w-3.5 h-3.5 rounded-full bg-white border border-white flex items-center justify-center">
                    <svg width="7" height="7" viewBox="0 0 10 10">
                        <polyline points="1,5 4,8 9,2" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Header */}
            <div className="z-10 mb-4">
                <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-sm font-bold leading-relaxed text-foreground group-hover:text-white transition-colors line-clamp-2 pr-5">
                        {d.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAKES_DOT[d.stakes] || STAKES_DOT.low }} />
                        {d.stakes}
                    </span>
                    <span className="text-xs text-muted-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold">
                        {d.reversibility}
                    </span>
                    <span className="text-xs text-subtle-foreground bg-overlay-subtle px-2 py-1 rounded-full border border-border-subtle uppercase tracking-wider font-bold">
                        {d.confidence}% Conf
                    </span>
                </div>
            </div>

            {/* Assumptions */}
            <div
                className="flex-1 relative overflow-hidden z-10 mb-4"
                style={{ maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}
            >
                {assumptions.length > 0 ? (
                    <div className="space-y-1.5 pl-3 border-l-2 border-border-subtle group-hover:border-border transition-colors">
                        {assumptions.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-xs text-muted-foreground leading-relaxed truncate">• {a}</div>
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
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-border-subtle bg-overlay-subtle text-muted-foreground flex items-center gap-1.5">
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

// ─── Section Divider ───

function SectionDivider({ label, count }) {
    return (
        <div className="col-span-full flex items-center gap-3 pt-2 pb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-subtle-foreground">{label}</span>
            <span className="text-xs text-faint-foreground tabular-nums">{count}</span>
            <div className="flex-1 h-px bg-overlay-subtle" />
        </div>
    );
}

// ─── Main Page ───

const SORT_CYCLE = { recent: 'az', az: 'stakes', stakes: 'recent' };
const SORT_LABEL = { recent: 'RECENT', az: 'A–Z', stakes: 'STAKES' };
const STAKES_ORDER = { high: 0, medium: 1, low: 2 };

export default function LedgerPage({ ledger = [], setLedger }) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);
    const [viewingId, setViewingId] = useState(null);
    const [sort, setSort] = useState("recent");
    const [showSettings, setShowSettings] = useState(false);

    // Filters for card grid
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'reviewed'
    const [filterStakes, setFilterStakes] = useState('all'); // 'all', 'high', 'medium', 'low'

    // Multi-select & Context Menu
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [menu, setMenu] = useState({ open: false, x: 0, y: 0, id: null });
    const menuRef = useRef(null);
    const settingsRef = useRef(null);

    // Pinned — persisted to localStorage
    const [pinnedArr, setPinnedArr] = useLocalStorage('maia.ledger.pinned', []);
    const pinned = useMemo(() => new Set(pinnedArr), [pinnedArr]);
    const setPinned = useCallback((fn) => {
        setPinnedArr(prev => Array.from(fn(new Set(prev))));
    }, [setPinnedArr]);

    // In-app confirm / rename state (replacing window.confirm / window.prompt)
    const [confirm, setConfirm] = useState(null); // { message, onConfirm, danger, confirmLabel }
    const [renaming, setRenaming] = useState(null); // { id, title }

    const askConfirm = useCallback((message, onConfirm, danger = true, confirmLabel = "Confirm") => {
        setConfirm({ message, onConfirm, danger, confirmLabel });
    }, []);

    // ─── Decision Mutations ───

    const addDecision = useCallback((data) => {
        const newDecision = { id: uid(), createdAt: isoNow(), status: "open", ...data };
        setLedger(prev => [newDecision, ...prev]);
        setIsCreating(false);
    }, [setLedger]);

    const updateDecision = useCallback((id, data) => {
        setLedger(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
        setEditingId(null);
    }, [setLedger]);

    const completeReview = useCallback((result) => {
        setLedger(prev => prev.map(d =>
            d.id === reviewingId
                ? { ...d, status: "reviewed", reviewedAt: isoNow(), outcome: result.outcome, outcomeStatus: result.status }
                : d
        ));
        setReviewingId(null);
    }, [setLedger, reviewingId]);

    const onDelete = useCallback((id) => {
        setLedger(prev => prev.filter(d => d.id !== id));
        setPinned(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, [setLedger, setPinned]);

    const onRename = useCallback((id, newTitle) => {
        setLedger(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
    }, [setLedger]);

    // ─── Select Mode ───

    const toggleSelected = useCallback((id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            if (next.size === 0) setSelectMode(false);
            return next;
        });
    }, []);

    const exitSelectMode = useCallback(() => {
        setSelectMode(false);
        setSelected(new Set());
    }, []);

    const handleContextMenu = useCallback((e, id) => {
        e.preventDefault();
        const menuWidth = 192;
        const menuHeight = 200;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > vw - 8) x = vw - menuWidth - 8;
        if (y + menuHeight > vh - 8) y = vh - menuHeight - 8;
        if (x < 8) x = 8;
        if (y < 8) y = 8;

        setMenu({ open: true, x, y, id });
    }, []);

    // ─── Seed Data ───

    const seedData = () => {
        const stakes = ['low', 'medium', 'high'];
        const reversibilities = ['reversible', 'costly', 'irreversible'];

        const newDecisions = Array.from({ length: 50 }).map((_, i) => {
            const isReviewed = Math.random() > 0.3;
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 90));

            let confidence = Math.floor(Math.random() * 10) * 10 + 10;
            let outcomeStatus = 'mixed';

            if (isReviewed) {
                const roll = Math.random();
                const successChance = confidence / 150 + 0.2;
                if (roll < successChance) outcomeStatus = 'success';
                else if (roll < successChance + 0.3) outcomeStatus = 'mixed';
                else outcomeStatus = 'failure';
            }

            return {
                id: uid(),
                createdAt: date.toISOString(),
                title: `Decision #${i + 1} — ${Math.random().toString(36).substring(7)}`,
                stakes: stakes[Math.floor(Math.random() * stakes.length)],
                reversibility: reversibilities[Math.floor(Math.random() * reversibilities.length)],
                confidence,
                assumptions: ["Assumption 1", "Assumption 2"],
                status: isReviewed ? 'reviewed' : 'open',
                reviewedAt: isReviewed ? new Date().toISOString() : null,
                outcome: isReviewed ? "This was the outcome..." : null,
                outcomeStatus: isReviewed ? outcomeStatus : null
            };
        });

        askConfirm(
            `Replace current ledger with 50 random decisions?`,
            () => setLedger(newDecisions),
            false,
            "Generate"
        );
    };

    // ─── Bulk Actions ───

    const bulkDelete = () => {
        askConfirm(
            `Delete ${selected.size} selected decision${selected.size !== 1 ? 's' : ''}?`,
            () => {
                setLedger(prev => prev.filter(d => !selected.has(d.id)));
                setPinned(prev => {
                    const next = new Set(prev);
                    selected.forEach(id => next.delete(id));
                    return next;
                });
                exitSelectMode();
            }
        );
    };

    const bulkPin = () => {
        setPinned(prev => {
            const next = new Set(prev);
            selected.forEach(id => next.add(id));
            return next;
        });
        exitSelectMode();
    };

    const bulkUnpin = () => {
        setPinned(prev => {
            const next = new Set(prev);
            selected.forEach(id => next.delete(id));
            return next;
        });
        exitSelectMode();
    };

    const deleteAll = useCallback(() => {
        askConfirm(
            `Permanently delete all ${ledger.length} decision${ledger.length !== 1 ? 's' : ''}?`,
            () => { setLedger([]); setPinnedArr([]); }
        );
    }, [ledger.length, setLedger, setPinnedArr, askConfirm]);

    // ─── Close on outside click / Escape ───

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenu(m => ({ ...m, open: false }));
            }
            if (settingsRef.current && !settingsRef.current.contains(e.target)) {
                setShowSettings(false);
            }
        };
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Dialog dismissal is handled by Base UI; this only covers
            // select mode, which is page state rather than an overlay.
            if (e.key === "Escape" && selectMode) exitSelectMode();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [exitSelectMode, selectMode]);

    // ─── Sorted & Filtered Decisions ───

    const sortFn = (a, b) => {
        const aPinned = pinned.has(a.id) ? 1 : 0;
        const bPinned = pinned.has(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        if (sort === 'az') return (a.title || "").localeCompare(b.title || "");
        if (sort === 'stakes') return (STAKES_ORDER[a.stakes] ?? 2) - (STAKES_ORDER[b.stakes] ?? 2);
        return new Date(b.createdAt) - new Date(a.createdAt);
    };

    const openDecisions = useMemo(() => {
        return ledger.filter(d => d.status === "open").sort(sortFn);
    }, [ledger, sort, pinned]);

    const reviewedDecisions = useMemo(() => {
        return ledger.filter(d => d.status === "reviewed").sort(sortFn);
    }, [ledger, sort, pinned]);

    // Apply card-grid filters
    const visibleOpen = useMemo(() => {
        if (filterStatus === 'reviewed') return [];
        if (filterStakes === 'all') return openDecisions;
        return openDecisions.filter(d => d.stakes === filterStakes);
    }, [openDecisions, filterStatus, filterStakes]);

    const visibleReviewed = useMemo(() => {
        if (filterStatus === 'open') return [];
        if (filterStakes === 'all') return reviewedDecisions;
        return reviewedDecisions.filter(d => d.stakes === filterStakes);
    }, [reviewedDecisions, filterStatus, filterStakes]);

    const hasResults = visibleOpen.length > 0 || visibleReviewed.length > 0;
    const isFiltered = filterStatus !== 'all' || filterStakes !== 'all';

    // ─── Render ───

    return (
        <div
            className="h-full w-full relative bg-black text-foreground overflow-y-auto custom-scrollbar"
            onClick={() => { if (selectMode) exitSelectMode(); }}
        >
            <div className="w-full px-page py-8 flex flex-col gap-8">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-border-subtle pt-2 gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">Ledger</span>
                        <span className="text-xs bg-overlay-subtle px-2 py-0.5 rounded-full text-muted-foreground">
                            {ledger.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="h-8 px-3 rounded-lg bg-white text-black hover:bg-foreground flex items-center justify-center transition-all gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                        >
                            <Plus size={14} strokeWidth={3} />
                            <span className="text-xs font-bold uppercase tracking-wide">New</span>
                        </button>

                        {/* Sort toggle — cycles recent → a-z → stakes */}
                        <button
                            onClick={() => setSort(s => SORT_CYCLE[s])}
                            className="h-8 px-3 rounded-lg bg-overlay-subtle hover:bg-overlay border border-border-subtle text-xs text-muted-foreground transition-colors flex items-center gap-2"
                        >
                            {SORT_LABEL[sort]}
                            <Filter size={14} />
                        </button>

                        <div ref={settingsRef} className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "h-8 w-8 flex items-center justify-center rounded-lg transition-colors border",
                                    showSettings ? 'bg-overlay border-border-strong text-white' : 'bg-overlay-subtle border-border-subtle text-muted-foreground hover:text-white hover:bg-overlay'
                                )}
                            >
                                <Settings size={16} />
                            </button>
                            {showSettings && (
                                <div className={cn(POPOVER_CLASS, "absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden py-1")}>
                                    <div className="px-4 py-2 text-xs uppercase tracking-widest text-subtle-foreground font-bold border-b border-border-subtle mb-1">
                                        Actions
                                    </div>
                                    <button
                                        onClick={() => { seedData(); setShowSettings(false); }}
                                        className="w-full px-4 py-2 text-left hover:bg-overlay-subtle flex items-center gap-3 text-[#10b981] group transition-colors"
                                    >
                                        <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-xs">Seed Data</span>
                                    </button>
                                    {ledger.length > 0 && (
                                        <button
                                            onClick={() => { deleteAll(); setShowSettings(false); }}
                                            className="w-full px-4 py-2 text-left hover:bg-overlay-subtle flex items-center gap-3 text-red-400 group transition-colors border-t border-border-subtle"
                                        >
                                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                            <span className="text-xs">Delete All</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <h1 className="font-sans font-semibold text-[#fafafa] leading-none" style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', letterSpacing: '-0.02em' }}>
                    Decisions
                </h1>
            </div>

            {/* Stats Overview */}
            <div className="px-page">
                <JudgmentOverview ledger={ledger} />
            </div>

            {/* Card Grid */}
            <div className="flex-1 min-h-0 px-page">

                {/* Filter Bar */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    {/* Status filter */}
                    <div className="flex bg-overlay-subtle rounded-lg p-1 gap-0.5">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'open', label: 'Open' },
                            { id: 'reviewed', label: 'Reviewed' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterStatus(f.id)}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                                    filterStatus === f.id ? "bg-overlay text-white shadow-sm" : "text-muted-foreground hover:text-foreground-secondary"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Stakes filter */}
                    <div className="flex bg-overlay-subtle rounded-lg p-1 gap-0.5">
                        {[
                            { id: 'all', label: 'All Stakes' },
                            { id: 'high', label: 'High', dot: STAKES_DOT.high },
                            { id: 'medium', label: 'Med', dot: STAKES_DOT.medium },
                            { id: 'low', label: 'Low', dot: STAKES_DOT.low },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterStakes(f.id)}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                                    filterStakes === f.id ? "bg-overlay text-white shadow-sm" : "text-muted-foreground hover:text-foreground-secondary"
                                )}
                            >
                                {f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.dot }} />}
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Clear filters */}
                    {isFiltered && (
                        <button
                            onClick={() => { setFilterStatus('all'); setFilterStakes('all'); }}
                            className="text-xs text-subtle-foreground hover:text-muted-foreground uppercase tracking-wider transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div
                    className="grid gap-4 mb-12"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                    onClick={() => { if (selectMode) exitSelectMode(); }}
                >
                    {/* Empty state */}
                    {ledger.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-subtle-foreground opacity-50 select-none">
                            <Scale size={40} className="mb-4 opacity-20" />
                            <p className="text-sm font-light uppercase tracking-widest">No decisions recorded</p>
                        </div>
                    )}

                    {/* Filtered empty state */}
                    {ledger.length > 0 && !hasResults && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-faint-foreground select-none">
                            <p className="text-xs uppercase tracking-widest">No decisions match this filter</p>
                        </div>
                    )}

                    {/* Open section */}
                    {visibleOpen.length > 0 && (
                        <>
                            <SectionDivider label="Open" count={visibleOpen.length} />
                            {visibleOpen.map(d => (
                                <DecisionCard
                                    key={d.id}
                                    d={d}
                                    onReview={setReviewingId}
                                    onView={setViewingId}
                                    isSelected={selected.has(d.id)}
                                    selectMode={selectMode}
                                    onToggle={toggleSelected}
                                    onContextMenu={handleContextMenu}
                                    isPinned={pinned.has(d.id)}
                                />
                            ))}
                        </>
                    )}

                    {/* Reviewed section */}
                    {visibleReviewed.length > 0 && (
                        <>
                            <SectionDivider label="Reviewed" count={visibleReviewed.length} />
                            {visibleReviewed.map(d => (
                                <DecisionCard
                                    key={d.id}
                                    d={d}
                                    onView={setViewingId}
                                    isSelected={selected.has(d.id)}
                                    selectMode={selectMode}
                                    onToggle={toggleSelected}
                                    onContextMenu={handleContextMenu}
                                    isPinned={pinned.has(d.id)}
                                />
                            ))}
                        </>
                    )}
                </div>

                <div className="h-24" />
            </div>

            {/* Modals */}
            {isCreating && <NewDecisionModal onClose={() => setIsCreating(false)} onSubmit={addDecision} />}
            {editingId && (
                <NewDecisionModal
                    onClose={() => setEditingId(null)}
                    onSubmit={(data) => updateDecision(editingId, data)}
                    initialData={ledger.find(d => d.id === editingId)}
                />
            )}
            {reviewingId && (
                <ReviewModal
                    decision={ledger.find(d => d.id === reviewingId)}
                    onClose={() => setReviewingId(null)}
                    onReview={completeReview}
                />
            )}
            {viewingId && (
                <DecisionDetailModal
                    decision={ledger.find(d => d.id === viewingId)}
                    onClose={() => setViewingId(null)}
                />
            )}

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={() => confirm?.onConfirm()}
                description={confirm?.message}
                confirmLabel={confirm?.confirmLabel || "Delete"}
                tone={confirm?.danger === false ? "default" : "danger"}
            />

            <PromptDialog
                open={!!renaming}
                onClose={() => setRenaming(null)}
                onSubmit={(newTitle) => onRename(renaming.id, newTitle)}
                title="Rename decision"
                label="Title"
                initialValue={renaming?.title || ""}
                submitLabel="Rename"
            />

            {/* Context Menu */}
            {menu.open && (
                <div
                    ref={menuRef}
                    className="fixed z-100 w-48 bg-[#09090b] border border-border rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menu.y, left: menu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {selectMode ? (
                        <>
                            <div className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground font-bold border-b border-border-subtle mb-1">
                                {selected.size} Selected
                            </div>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => { bulkPin(); setMenu({ ...menu, open: false }); }}
                            >
                                <Pin size={14} />
                                Pin All
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => { bulkUnpin(); setMenu({ ...menu, open: false }); }}
                            >
                                <Pin size={14} className="opacity-50" />
                                Unpin All
                            </button>
                            <div className="h-px bg-overlay my-1" />
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                onClick={() => { bulkDelete(); setMenu({ ...menu, open: false }); }}
                            >
                                <Trash2 size={14} />
                                Delete Selected
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setPinned(prev => {
                                        const next = new Set(prev);
                                        if (next.has(menu.id)) next.delete(menu.id); else next.add(menu.id);
                                        return next;
                                    });
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <Pin size={14} />
                                {pinned.has(menu.id) ? "Unpin Decision" : "Pin Decision"}
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setEditingId(menu.id);
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <PenLine size={14} />
                                Edit
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    const d = ledger.find(d => d.id === menu.id);
                                    setRenaming({ id: menu.id, title: d?.title || '' });
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <PenLine size={14} className="opacity-50" />
                                Rename
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-foreground-secondary hover:bg-overlay hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setSelectMode(true);
                                    setSelected(new Set([menu.id]));
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <Circle size={14} />
                                Select
                            </button>
                            <div className="h-px bg-overlay my-1" />
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                onClick={() => {
                                    askConfirm("Delete this decision?", () => onDelete(menu.id));
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

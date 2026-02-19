import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { cn } from "@/lib/utils";
import { Plus, Sparkles, Settings, Trash2, Scale, Pin, PenLine, Circle } from "lucide-react";
import ProjectIcon from "../components/ProjectIcon";
import { JudgmentOverview } from "@/features/Ledger/components/JudgmentOverview";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useLongPress } from "../hooks/useLongPress";

/* ──────────────────────────────────────────────────────────
   LedgerPage  –  Decision Journal & Cognitive Feedback Loop
   ────────────────────────────────────────────────────────── */

const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";
const INPUT_CLEAN = "w-full bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-700/50 font-mono transition-all resize-none p-0 focus:ring-0";
const LABEL_CLASS = "text-fluid-3xs font-bold uppercase tracking-widest text-zinc-600 font-mono mb-3 block";

// Shared color tokens
const STAKES_DOT = { high: '#FE083D', medium: '#FEEE08', low: '#0885FE' };
const OUTCOME_DOT = { success: '#93FD23', mixed: '#FEEE08', failure: '#FE083D' };

// ─── Shared Components ───

function CloseButton({ onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={cn("w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors", className)}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    );
}

// ─── Confirm Modal (replaces window.confirm) ───

function ConfirmModal({ message, onConfirm, onCancel, danger = true, confirmLabel = "Confirm" }) {
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm mx-4 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <p className="text-sm font-mono text-zinc-300 leading-relaxed mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "text-xs font-bold font-mono uppercase tracking-wider transition-colors",
                            danger ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Rename Modal (replaces window.prompt) ───

function RenameModal({ initialValue, onConfirm, onCancel }) {
    const [value, setValue] = useState(initialValue || '');

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm mx-4 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <label className={LABEL_CLASS}>Rename Decision</label>
                <input
                    autoFocus
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
                        if (e.key === 'Escape') onCancel();
                    }}
                    className={cn(INPUT_CLEAN, "text-sm border-b border-white/10 pb-2")}
                />
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onCancel} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                    <button
                        onClick={() => value.trim() && onConfirm(value.trim())}
                        className="text-xs font-bold font-mono uppercase tracking-wider text-white hover:text-zinc-300 transition-colors"
                    >
                        Rename
                    </button>
                </div>
            </div>
        </div>
    );
}

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
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[calc(100dvh-2rem)] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white flex items-center gap-2 font-mono">
                        <Scale size={14} className="text-zinc-500" />
                        {isEditing ? "Edit Decision" : "Log Decision"}
                    </h2>
                    <CloseButton onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-8">
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
                            <div className="flex gap-1">
                                {['low', 'medium', 'high'].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, stakes: s })}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-fluid-3xs font-bold font-mono uppercase tracking-wider transition-all",
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
                                            "px-3 py-1.5 rounded-lg text-fluid-3xs font-bold font-mono uppercase tracking-wider transition-all",
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
                            {isEditing ? "Save Changes" : "Log Decision"}
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
                className="w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[calc(100dvh-2rem)] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white font-mono">Review Outcome</h2>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="px-8 pb-8 space-y-6">
                    {/* Decision Summary */}
                    <div>
                        <div className="text-xl font-medium text-zinc-200 font-mono mb-3">{decision.title}</div>
                        {/* Confidence prediction — core of calibration */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-fluid-3xs text-zinc-600 font-mono uppercase tracking-widest">You predicted</span>
                            <span className="text-sm font-bold font-mono text-white">{decision.confidence}%</span>
                            <span className="text-fluid-3xs text-zinc-600 font-mono uppercase tracking-widest">confidence</span>
                        </div>
                        {decision.assumptions && decision.assumptions.length > 0 && (
                            <div className="space-y-1 pl-3 border-l-2 border-white/5">
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
                                        "px-4 py-2 rounded-lg text-fluid-3xs font-bold font-mono uppercase tracking-wider transition-all",
                                        status === s
                                            ? (s === 'success' ? 'bg-[#93FD23]/10 text-[#93FD23]' : s === 'failure' ? 'bg-[#FE083D]/10 text-[#FE083D]' : 'bg-[#FEEE08]/10 text-[#FEEE08]')
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

// ─── Decision Detail Modal (Read-Only) ───

function DecisionDetailModal({ decision, onClose }) {
    if (!decision) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[calc(100dvh-2rem)] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white font-mono">Decision Review</h2>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="px-8 pb-8 space-y-6">
                    {/* Decision Title & Tags */}
                    <div>
                        <div className="text-xl font-medium text-zinc-200 font-mono mb-3">{decision.title}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-fluid-3xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold font-mono flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAKES_DOT[decision.stakes] || STAKES_DOT.low }} />
                                {decision.stakes}
                            </span>
                            <span className="text-fluid-3xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold font-mono">
                                {decision.reversibility}
                            </span>
                            <span className="text-fluid-3xs text-zinc-600 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold font-mono">
                                {decision.confidence}% Conf
                            </span>
                        </div>
                    </div>

                    {/* Assumptions */}
                    {decision.assumptions && decision.assumptions.length > 0 && (
                        <div className="pt-4 border-t border-white/5">
                            <div className={LABEL_CLASS}>Assumptions</div>
                            <div className="space-y-1.5 pl-3 border-l-2 border-white/10">
                                {decision.assumptions.map((a, i) => (
                                    <div key={i} className="text-xs font-mono text-zinc-500 leading-relaxed">• {a}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Outcome */}
                    {decision.outcome && (
                        <div className="pt-4 border-t border-white/5">
                            <div className={LABEL_CLASS}>Actual Outcome</div>
                            <div className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">{decision.outcome}</div>
                        </div>
                    )}

                    {/* Result Assessment */}
                    {decision.outcomeStatus && (
                        <div className="pt-4 border-t border-white/5">
                            <div className={LABEL_CLASS}>Result Assessment</div>
                            <span className="text-fluid-3xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-white/5 bg-white/5 text-zinc-500 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: OUTCOME_DOT[decision.outcomeStatus] }} />
                                {decision.outcomeStatus}
                            </span>
                        </div>
                    )}

                    {/* Reviewed Date */}
                    {decision.reviewedAt && (
                        <div className="text-fluid-3xs text-zinc-600 font-mono uppercase tracking-wider pt-2">
                            Reviewed {new Date(decision.reviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Decision Card ───

function DecisionCard({ d, onReview, onView, isSelected, selectMode, onToggle, onContextMenu, isPinned }) {
    const longPress = useLongPress((touch) => {
        onContextMenu({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} }, d.id);
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
                "group relative p-5 flex flex-col justify-between rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden font-mono",
                isSelected
                    ? "bg-zinc-900 border-white/50"
                    : isReviewed
                        ? "h-auto min-h-[220px] bg-black border-white/10 opacity-70 hover:opacity-100"
                        : "h-auto min-h-[220px] bg-black border-white/10 hover:border-white/20 hover:bg-[#09090b] hover:shadow-2xl"
            )}
        >
            {/* Top-right: select circle on hover / pin dot when pinned */}
            <div className={cn(
                "absolute top-4 right-4 z-20 w-3.5 h-3.5 rounded-full transition-all duration-200 flex items-center justify-center",
                isSelected
                    ? "bg-white border border-white"
                    : isPinned
                        ? "bg-white"
                        : "border border-white/15 bg-transparent opacity-0 group-hover:opacity-100"
            )}>
                {isSelected && (
                    <svg width="7" height="7" viewBox="0 0 10 10">
                        <polyline points="1,5 4,8 9,2" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            {/* Header */}
            <div className="z-10 mb-4">
                <div className="flex justify-between items-start mb-3 gap-4">
                    <h3 className="text-sm font-bold leading-relaxed text-zinc-200 group-hover:text-white transition-colors line-clamp-2 pr-5">
                        {d.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-fluid-3xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STAKES_DOT[d.stakes] || STAKES_DOT.low }} />
                        {d.stakes}
                    </span>
                    <span className="text-fluid-3xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold">
                        {d.reversibility}
                    </span>
                    <span className="text-fluid-3xs text-zinc-600 bg-white/5 px-2 py-1 rounded-full border border-white/5 uppercase tracking-wider font-bold">
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
                    <div className="space-y-1.5 pl-3 border-l-2 border-white/5 group-hover:border-white/10 transition-colors">
                        {assumptions.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-fluid-3xs text-zinc-500 leading-relaxed truncate">• {a}</div>
                        ))}
                        {assumptions.length > 3 && <div className="text-fluid-3xs text-zinc-600 italic">+{assumptions.length - 3} more</div>}
                    </div>
                ) : (
                    <div className="text-fluid-3xs text-zinc-700 italic">No assumptions recorded</div>
                )}
            </div>

            {/* Outcome (reviewed only) */}
            {isReviewed && d.outcome && (
                <div className="pt-4 mt-4">
                    <div className="text-fluid-3xs uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Outcome</div>
                    <div className="text-zinc-400 text-fluid-3xs leading-relaxed line-clamp-3">{d.outcome}</div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-5 z-10">
                <span className="text-fluid-3xs font-bold text-zinc-600 uppercase tracking-wider">
                    {dateStr}
                </span>

                <div className="flex items-center gap-2">
                    {isReviewed ? (
                        <span className="text-fluid-3xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-white/5 bg-white/5 text-zinc-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: OUTCOME_DOT[d.outcomeStatus] }} />
                            {d.outcomeStatus}
                        </span>
                    ) : (
                        /* Persistent dim "awaiting review" — becomes bright on hover */
                        <span className={cn(
                            "text-fluid-3xs font-bold uppercase tracking-wider transition-colors",
                            selectMode ? "opacity-0" : "text-zinc-700 group-hover:text-zinc-400"
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
            <span className="text-fluid-3xs font-bold uppercase tracking-widest text-zinc-600 font-mono">{label}</span>
            <span className="text-fluid-3xs text-zinc-700 font-mono tabular-nums">{count}</span>
            <div className="flex-1 h-px bg-white/5" />
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
            if (e.key === "Escape") {
                if (selectMode) exitSelectMode();
                else if (confirm) setConfirm(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [exitSelectMode, selectMode, confirm]);

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
            className="h-full w-full relative bg-black font-mono text-zinc-200 overflow-y-auto custom-scrollbar"
            onClick={() => { if (selectMode) exitSelectMode(); }}
        >
            <div className="w-full px-6 md:px-8 py-8 flex flex-col gap-8">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-white/5 pt-2 gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <span className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">Ledger</span>
                        <span className="text-fluid-3xs bg-white/5 px-2 py-0.5 rounded-full text-zinc-500 font-mono">
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

                        {/* Sort toggle — cycles recent → a-z → stakes */}
                        <button
                            onClick={() => setSort(s => SORT_CYCLE[s])}
                            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 font-mono transition-colors flex items-center gap-2"
                        >
                            {SORT_LABEL[sort]}
                            <ProjectIcon name="filter" size={14} />
                        </button>

                        <div ref={settingsRef} className="relative">
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
                                    <div className="px-4 py-2 text-fluid-3xs uppercase tracking-widest text-zinc-600 font-bold border-b border-white/5 mb-1 font-mono">
                                        Actions
                                    </div>
                                    <button
                                        onClick={() => { seedData(); setShowSettings(false); }}
                                        className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-emerald-400 group transition-colors"
                                    >
                                        <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-mono">Seed Data</span>
                                    </button>
                                    {ledger.length > 0 && (
                                        <button
                                            onClick={() => { deleteAll(); setShowSettings(false); }}
                                            className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-red-400 group transition-colors border-t border-white/5"
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

            {/* Stats Overview */}
            <div className="px-6 md:px-8">
                <JudgmentOverview ledger={ledger} />
            </div>

            {/* Card Grid */}
            <div className="flex-1 min-h-0 px-6 md:px-8">

                {/* Filter Bar */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    {/* Status filter */}
                    <div className="flex bg-white/5 rounded-lg p-1 gap-0.5">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'open', label: 'Open' },
                            { id: 'reviewed', label: 'Reviewed' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterStatus(f.id)}
                                className={cn(
                                    "px-3 py-1 text-fluid-3xs font-bold font-mono uppercase tracking-wider rounded-md transition-all",
                                    filterStatus === f.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Stakes filter */}
                    <div className="flex bg-white/5 rounded-lg p-1 gap-0.5">
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
                                    "px-3 py-1 text-fluid-3xs font-bold font-mono uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5",
                                    filterStakes === f.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
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
                            className="text-fluid-3xs text-zinc-600 hover:text-zinc-400 font-mono uppercase tracking-wider transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mb-12"
                    onClick={() => { if (selectMode) exitSelectMode(); }}
                >
                    {/* Empty state */}
                    {ledger.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-600 opacity-50 select-none">
                            <Scale size={40} className="mb-4 opacity-20" />
                            <p className="text-sm font-light uppercase tracking-widest font-mono">No decisions recorded</p>
                        </div>
                    )}

                    {/* Filtered empty state */}
                    {ledger.length > 0 && !hasResults && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-700 select-none">
                            <p className="text-xs font-mono uppercase tracking-widest">No decisions match this filter</p>
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

            {/* In-app Confirm Dialog */}
            {confirm && (
                <ConfirmModal
                    message={confirm.message}
                    danger={confirm.danger}
                    confirmLabel={confirm.confirmLabel}
                    onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
                    onCancel={() => setConfirm(null)}
                />
            )}

            {/* In-app Rename Dialog */}
            {renaming && (
                <RenameModal
                    initialValue={renaming.title}
                    onConfirm={(newTitle) => { onRename(renaming.id, newTitle); setRenaming(null); }}
                    onCancel={() => setRenaming(null)}
                />
            )}

            {/* Context Menu */}
            {menu.open && (
                <div
                    ref={menuRef}
                    className="fixed z-[100] w-48 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menu.y, left: menu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {selectMode ? (
                        <>
                            <div className="px-4 py-2 text-fluid-3xs uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5 mb-1">
                                {selected.size} Selected
                            </div>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => { bulkPin(); setMenu({ ...menu, open: false }); }}
                            >
                                <Pin size={14} />
                                Pin All
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => { bulkUnpin(); setMenu({ ...menu, open: false }); }}
                            >
                                <Pin size={14} className="opacity-50" />
                                Unpin All
                            </button>
                            <div className="h-px bg-white/10 my-1" />
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
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
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
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setEditingId(menu.id);
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <PenLine size={14} />
                                Edit
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
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
                                className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setSelectMode(true);
                                    setSelected(new Set([menu.id]));
                                    setMenu({ ...menu, open: false });
                                }}
                            >
                                <Circle size={14} />
                                Select
                            </button>
                            <div className="h-px bg-white/10 my-1" />
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

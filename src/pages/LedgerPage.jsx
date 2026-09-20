import { useState, useMemo, useCallback, useEffect } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { cn } from "@/lib/utils";
import { PlusSignSquare as Plus, AiMagic as Sparkles, Settings01 as Settings, Delete01 as Trash2, BalanceScale as Scale, Pin, Pen01 as PenLine, Circle, Filter } from "../components/ui/CustomIcon.jsx";
import { JudgmentOverview } from "@/features/Ledger/components/JudgmentOverview";
import { DecisionCard, SectionDivider } from "@/features/Ledger/components/DecisionCard";
import { NewDecisionModal, ReviewModal, DecisionDetailModal } from "@/features/Ledger/components/LedgerModals";
import { STAKES_DOT } from "@/features/Ledger/components/decisionStyles";
import { EmptyState } from "@/components/composed/EmptyState";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { PageTitle } from "@/components/composed/PageHeader";

/* ──────────────────────────────────────────────────────────
   LedgerPage  –  Decision Journal & Cognitive Feedback Loop
   ────────────────────────────────────────────────────────── */

// ─── Main Page ───

const SORT_CYCLE = { recent: 'az', az: 'stakes', stakes: 'recent' };
const SORT_LABEL = { recent: 'RECENT', az: 'A–Z', stakes: 'STAKES' };
const STAKES_ORDER = { high: 0, medium: 1, low: 2 };

// DecisionCard calls an `onContextMenu` prop for both real right-clicks and
// its synthetic long-press event. The actual menu is owned by the
// Menu.ContextTrigger below, which opens natively for both gestures — this
// stub only keeps that contract satisfied.
function handleCardContextMenu(e) {
    e.preventDefault();
}

/**
 * One decision card wrapped in the app's context-menu primitive.
 *
 * Menu.ContextTrigger owns opening: right-click and touch long-press both
 * anchor the portalled popup at the pointer, with menu roles, keyboard nav
 * and the z-popover layer the old hand-positioned fixed menu lacked. In
 * select mode the same menu switches to the bulk actions.
 */
function DecisionCardMenu({ d, selectMode, selectedCount, cardProps, actions }) {
    return (
        <Menu.Context>
            <Menu.ContextTrigger className="contents">
                <DecisionCard {...cardProps} onContextMenu={handleCardContextMenu} />
            </Menu.ContextTrigger>

            <Menu.ContextContent>
                {selectMode ? (
                    <>
                        <Menu.ContextLabel>{selectedCount} Selected</Menu.ContextLabel>
                        <Menu.ContextItem onClick={actions.bulkPin}>
                            <Pin />
                            Pin All
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={actions.bulkUnpin}>
                            <Pin className="opacity-50" />
                            Unpin All
                        </Menu.ContextItem>
                        <Menu.ContextSeparator />
                        <ContextDangerItem onClick={actions.bulkDelete}>
                            <Trash2 />
                            Delete Selected
                        </ContextDangerItem>
                    </>
                ) : (
                    <>
                        <Menu.ContextItem onClick={() => actions.togglePin(d.id)}>
                            <Pin />
                            {cardProps.isPinned ? "Unpin Decision" : "Pin Decision"}
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.edit(d.id)}>
                            <PenLine />
                            Edit
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.rename(d.id)}>
                            <PenLine className="opacity-50" />
                            Rename
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.select(d.id)}>
                            <Circle />
                            Select
                        </Menu.ContextItem>
                        <Menu.ContextSeparator />
                        <ContextDangerItem onClick={() => actions.delete(d.id)}>
                            <Trash2 />
                            Delete
                        </ContextDangerItem>
                    </>
                )}
            </Menu.ContextContent>
        </Menu.Context>
    );
}

export default function LedgerPage({ ledger = [], setLedger }) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);
    const [viewingId, setViewingId] = useState(null);
    const [sort, setSort] = useState("recent");

    // Filters for card grid
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'reviewed'
    const [filterStakes, setFilterStakes] = useState('all'); // 'all', 'high', 'medium', 'low'

    // Multi-select (context menus are owned by Menu.Context on each card)
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(new Set());

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

    // ─── Seed Data ───
    //
    // Dev-only fixture generator. It silently replaces the ENTIRE ledger with
    // 50 fake decisions — no undo — so it must never be reachable from a
    // production build, not even through the console: guard the function as
    // well as hiding the menu entry.

    const seedData = () => {
        if (!import.meta.env.DEV) return;

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

    // Actions the per-card context menu dispatches — one object shared by
    // every card so both grid sections stay in step.
    const menuActions = {
        togglePin: (id) => {
            setPinned(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
        },
        edit: setEditingId,
        rename: (id) => setRenaming({ id, title: ledger.find(d => d.id === id)?.title || '' }),
        select: (id) => {
            setSelectMode(true);
            setSelected(new Set([id]));
        },
        delete: (id) => askConfirm("Delete this decision?", () => onDelete(id)),
        bulkPin,
        bulkUnpin,
        bulkDelete,
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Dialog and menu dismissal are handled by Base UI; this only
            // covers select mode, which is page state rather than an overlay.
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
            className="h-full w-full relative bg-background text-foreground overflow-y-auto custom-scrollbar"
            onClick={() => { if (selectMode) exitSelectMode(); }}
        >
            <div className="w-full px-page py-8 flex flex-col gap-8">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl flex-none flex items-center justify-between pb-6 border-b border-border-subtle pt-2 gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">Ledger</span>
                        <span className="text-xs bg-overlay-subtle px-2 py-0.5 rounded-full text-muted-foreground tabular-nums">
                            {ledger.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button size="sm" onClick={() => setIsCreating(true)}>
                            <Plus strokeWidth={3} />
                            New
                        </Button>

                        {/* Sort toggle — cycles recent → a-z → stakes */}
                        <Button variant="outline" size="sm" onClick={() => setSort(s => SORT_CYCLE[s])}>
                            {SORT_LABEL[sort]}
                            <Filter />
                        </Button>

                        <Menu.Root>
                            <Menu.Trigger
                                render={
                                    <Button variant="outline" size="icon-sm" aria-label="Settings">
                                        <Settings />
                                    </Button>
                                }
                            />
                            <Menu.Content align="end">
                                <Menu.Group>
                                    <Menu.Label className="text-xs font-bold uppercase tracking-widest">Actions</Menu.Label>
                                    {/* Destructive full-replace fixture — dev builds only (see seedData) */}
                                    {import.meta.env.DEV && (
                                        <Menu.Item onClick={seedData} className="text-success">
                                            <Sparkles />
                                            Seed Data
                                        </Menu.Item>
                                    )}
                                    {ledger.length > 0 && (
                                        <>
                                            <Menu.Separator />
                                            <MenuDangerItem onClick={deleteAll}>
                                                <Trash2 />
                                                Delete All
                                            </MenuDangerItem>
                                        </>
                                    )}
                                </Menu.Group>
                            </Menu.Content>
                        </Menu.Root>
                    </div>
                </div>

                <PageTitle>Decisions</PageTitle>
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
                                    filterStatus === f.id ? "bg-overlay text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground-secondary"
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
                                    filterStakes === f.id ? "bg-overlay text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground-secondary"
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
                        <EmptyState
                            size="page"
                            className="col-span-full"
                            icon={Scale}
                            title="No decisions recorded"
                            description="Log a decision with your confidence prediction — review it later to calibrate your judgment."
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setIsCreating(true); }}
                                >
                                    Log Decision
                                </Button>
                            }
                        />
                    )}

                    {/* Filtered empty state */}
                    {ledger.length > 0 && !hasResults && (
                        <EmptyState
                            size="page"
                            className="col-span-full"
                            icon={Filter}
                            title="No decisions match this filter"
                            description="Nothing matches the current status and stakes filters."
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setFilterStatus('all'); setFilterStakes('all'); }}
                                >
                                    Clear Filters
                                </Button>
                            }
                        />
                    )}

                    {/* Open section */}
                    {visibleOpen.length > 0 && (
                        <>
                            <SectionDivider label="Open" count={visibleOpen.length} />
                            {visibleOpen.map(d => (
                                <DecisionCardMenu
                                    key={d.id}
                                    d={d}
                                    selectMode={selectMode}
                                    selectedCount={selected.size}
                                    cardProps={{
                                        d,
                                        onReview: setReviewingId,
                                        onView: setViewingId,
                                        isSelected: selected.has(d.id),
                                        selectMode,
                                        onToggle: toggleSelected,
                                        isPinned: pinned.has(d.id),
                                    }}
                                    actions={menuActions}
                                />
                            ))}
                        </>
                    )}

                    {/* Reviewed section */}
                    {visibleReviewed.length > 0 && (
                        <>
                            <SectionDivider label="Reviewed" count={visibleReviewed.length} />
                            {visibleReviewed.map(d => (
                                <DecisionCardMenu
                                    key={d.id}
                                    d={d}
                                    selectMode={selectMode}
                                    selectedCount={selected.size}
                                    cardProps={{
                                        d,
                                        onView: setViewingId,
                                        isSelected: selected.has(d.id),
                                        selectMode,
                                        onToggle: toggleSelected,
                                        isPinned: pinned.has(d.id),
                                    }}
                                    actions={menuActions}
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
        </div>
    );
}

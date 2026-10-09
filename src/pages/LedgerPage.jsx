import { useState, useMemo, useCallback, useEffect } from "react";
import { uid, isoNow } from "../lib/ids.js";
import { PlusSignSquare as Plus, AiMagic as Sparkles, Settings01 as Settings, Delete01 as Trash2, BalanceScale as Scale, Filter } from "../components/ui/CustomIcon.jsx";
import { JudgmentOverview } from "@/features/Ledger/components/JudgmentOverview";
import { SectionDivider } from "@/features/Ledger/components/DecisionCard";
import { DecisionCardMenu } from "@/features/Ledger/components/DecisionCardMenu";
import { LedgerFilters } from "@/features/Ledger/components/LedgerFilters";
import { buildSeedDecisions } from "@/features/Ledger/components/seedDecisions";
import { NewDecisionModal, ReviewModal, DecisionDetailModal } from "@/features/Ledger/components/LedgerModals";
import { EmptyState } from "@/components/composed/EmptyState";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { PageHeader, PageTitle } from "@/components/composed/PageHeader";
import styles from "./LedgerPage.module.css";

/* LedgerPage: decision journal and cognitive feedback loop */

const STAKES_ORDER = { high: 0, medium: 1, low: 2 };

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

    // Pinned, persisted to localStorage
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
    // Dev-only fixture generator. It replaces the ENTIRE ledger with 50 fake
    // decisions (no undo), so it must never be reachable from a production
    // build, not even through the console: guard the function as well as
    // hiding the menu entry.

    const seedData = () => {
        if (!import.meta.env.DEV) return;

        const newDecisions = buildSeedDecisions();

        askConfirm(
            "Replace the current ledger with 50 sample decisions?",
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

    // Actions the per-card context menu dispatches: one object shared by
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

    const clearFilters = () => { setFilterStatus('all'); setFilterStakes('all'); };
    const startCreating = () => setIsCreating(true);

    const renderCards = (list, extra) => list.map(d => (
        <DecisionCardMenu
            key={d.id}
            d={d}
            selectMode={selectMode}
            selectedCount={selected.size}
            cardProps={{
                d,
                ...extra,
                onView: setViewingId,
                isSelected: selected.has(d.id),
                selectMode,
                onToggle: toggleSelected,
                isPinned: pinned.has(d.id),
            }}
            actions={menuActions}
        />
    ));

    return (
        <div
            className={styles.page}
            onClick={() => { if (selectMode) exitSelectMode(); }}
        >
            <div className={styles.inner}>
                <PageHeader
                    eyebrow="Ledger"
                    count={ledger.length}
                    actions={
                        <>
                            <Button size="sm" onClick={startCreating}>
                                <Plus aria-hidden="true" />
                                New decision
                            </Button>

                            <Menu.Root>
                                <Menu.Trigger
                                    render={<IconButton label="Ledger actions" variant="secondary" icon={Settings} />}
                                />
                                <Menu.Content align="end">
                                    <Menu.Group>
                                        <Menu.Label>Actions</Menu.Label>
                                        {/* Destructive full-replace fixture, dev builds only (see seedData) */}
                                        {import.meta.env.DEV && (
                                            <Menu.Item onClick={seedData}>
                                                <Sparkles />
                                                Add sample data
                                            </Menu.Item>
                                        )}
                                        {ledger.length > 0 && (
                                            <>
                                                <Menu.Separator />
                                                <MenuDangerItem onClick={deleteAll}>
                                                    <Trash2 />
                                                    Delete all decisions
                                                </MenuDangerItem>
                                            </>
                                        )}
                                    </Menu.Group>
                                </Menu.Content>
                            </Menu.Root>
                        </>
                    }
                />

                <PageTitle>Decisions</PageTitle>

                <JudgmentOverview ledger={ledger} onLog={startCreating} />

                <section aria-label="Decisions">
                    <LedgerFilters
                        status={filterStatus}
                        stakes={filterStakes}
                        sort={sort}
                        isFiltered={isFiltered}
                        onStatus={setFilterStatus}
                        onStakes={setFilterStakes}
                        onSort={setSort}
                        onClear={clearFilters}
                    />

                    <div className={styles.grid} onClick={() => { if (selectMode) exitSelectMode(); }}>
                        {ledger.length === 0 && (
                            <EmptyState
                                size="page"
                                className={styles.fullRow}
                                icon={Scale}
                                title="No decisions recorded"
                                description="Log a decision with your confidence prediction, then review it later to calibrate your judgment."
                                action={
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); startCreating(); }}
                                    >
                                        Log decision
                                    </Button>
                                }
                            />
                        )}

                        {ledger.length > 0 && !hasResults && (
                            <EmptyState
                                size="page"
                                className={styles.fullRow}
                                icon={Filter}
                                title="No decisions match this filter"
                                description="Nothing matches the current status and stakes filters."
                                action={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>}
                            />
                        )}

                        {visibleOpen.length > 0 && (
                            <>
                                <SectionDivider label="Open" count={visibleOpen.length} />
                                {renderCards(visibleOpen, { onReview: setReviewingId })}
                            </>
                        )}

                        {visibleReviewed.length > 0 && (
                            <>
                                <SectionDivider label="Reviewed" count={visibleReviewed.length} />
                                {renderCards(visibleReviewed)}
                            </>
                        )}
                    </div>
                </section>
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

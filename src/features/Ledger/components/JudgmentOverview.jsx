import { useState, useMemo } from 'react';
import { SectionCard } from "@/components/composed/SectionCard";
import { CalibrationChart } from './CalibrationChart';
import { VelocityChart } from './VelocityChart';
import { OutcomeDistribution } from './OutcomeDistribution';
import { cn } from "@/lib/utils";

/**
 * The Ledger's three chart panels, rendered as Opus section cards
 * (translucent card + blur + hairline border + shadow) instead of flat black
 * panels. The chart bodies adapt to the card height via flexbox.
 */

const CARD_BODY = "flex-1 min-h-0 px-5 pb-5 pt-4";

// Right-aligned caption in each card header ("EXP VS ACT" etc.)
const CARD_ACTION = "text-xs text-subtle-foreground uppercase tracking-wider";

export function JudgmentOverview({ ledger }) {
    const [timeRange, setTimeRange] = useState('all'); // '30d', '90d', 'all'
    const [stakesFilter, setStakesFilter] = useState('all'); // 'high', 'all'

    // Filter Data
    const filteredData = useMemo(() => {
        let data = [...ledger];

        if (timeRange !== 'all') {
            const now = new Date();
            const days = timeRange === '30d' ? 30 : 90;
            const cutoff = new Date(now.setDate(now.getDate() - days));
            data = data.filter(d => new Date(d.createdAt) >= cutoff);
        }

        if (stakesFilter === 'high') {
            data = data.filter(d => d.stakes === 'high');
        }

        return data;
    }, [ledger, timeRange, stakesFilter]);

    // Calculate summary stats
    const totalDecisions = filteredData.length;
    const reviewedDecisions = filteredData.filter(d => d.status === 'reviewed').length;
    const reviewRate = totalDecisions > 0 ? Math.round((reviewedDecisions / totalDecisions) * 100) : 0;

    return (
        <div className="w-full mb-8">
            {/* Header & Filters */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_var(--success)]"></span>
                        Judgment Overview
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                        Cognitive Feedback Loop • {totalDecisions} Decisions • {reviewRate}% Reviewed
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range */}
                    <div className="flex bg-overlay-subtle rounded-lg p-1 gap-1">
                        {[{ id: '30d', label: '30D' }, { id: '90d', label: '90D' }, { id: 'all', label: 'ALL' }].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTimeRange(t.id)}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold uppercase rounded-md transition-all",
                                    timeRange === t.id ? "bg-overlay text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground-secondary"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* High Stakes Toggle */}
                    <button
                        onClick={() => setStakesFilter(prev => prev === 'all' ? 'high' : 'all')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all",
                            stakesFilter === 'high'
                                ? "bg-destructive/10 border-destructive/20 text-destructive"
                                : "bg-overlay-subtle border-border-subtle text-muted-foreground hover:text-foreground-secondary"
                        )}
                    >
                        High Stakes Only
                    </button>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 auto-rows-[200px] sm:auto-rows-[220px] lg:auto-rows-[240px]">
                {/* 1. Calibration */}
                <SectionCard
                    className="lg:col-span-2"
                    title="Confidence Calibration"
                    action={<span className={CARD_ACTION}>Exp vs Act</span>}
                    bodyClassName={CARD_BODY}
                >
                    <div className="h-full w-full relative">
                        <CalibrationChart data={filteredData} />
                    </div>
                </SectionCard>

                {/* 2. Velocity */}
                <SectionCard
                    className="lg:col-span-2"
                    title="Decision Velocity"
                    action={<span className={CARD_ACTION}>Weekly Volume</span>}
                    bodyClassName={CARD_BODY}
                >
                    <div className="h-full w-full relative">
                        <VelocityChart data={filteredData} />
                    </div>
                </SectionCard>

                {/* 3. Outcomes */}
                <SectionCard
                    className="md:col-span-2 lg:col-span-1"
                    title="Outcome Scorecard"
                    action={<span className={CARD_ACTION}>Reviewed Only</span>}
                    bodyClassName={CARD_BODY}
                >
                    <div className="h-full w-full relative">
                        <OutcomeDistribution data={filteredData} />
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}

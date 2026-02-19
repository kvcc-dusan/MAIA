import React, { useState, useMemo } from 'react';
import { CalibrationChart } from './CalibrationChart';
import { VelocityChart } from './VelocityChart';
import { OutcomeDistribution } from './OutcomeDistribution';
import { cn } from "@/lib/utils";

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
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#93FD23] animate-pulse shadow-[0_0_10px_rgba(147,253,35,0.5)]"></span>
                        Judgment Overview
                    </h2>
                    <p className="text-fluid-3xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
                        Cognitive Feedback Loop • {totalDecisions} Decisions • {reviewRate}% Reviewed
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range */}
                    <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                        {[{ id: '30d', label: '30D' }, { id: '90d', label: '90D' }, { id: 'all', label: 'ALL' }].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTimeRange(t.id)}
                                className={cn(
                                    "px-3 py-1 text-fluid-3xs font-bold font-mono uppercase rounded-md transition-all",
                                    timeRange === t.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
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
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-fluid-3xs font-bold font-mono uppercase transition-all",
                            stakesFilter === 'high'
                                ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        High Stakes Only
                    </button>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 auto-rows-[200px] sm:auto-rows-[220px] lg:auto-rows-[240px]">
                {/* 1. Calibration */}
                <div className="lg:col-span-2 bg-black border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 z-10 relative">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Confidence Calibration</h3>
                        <span className="text-fluid-3xs text-zinc-600 font-mono">EXP VS ACT</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                    <div className="h-[120px] sm:h-[140px] lg:h-[160px] w-full relative z-0">
                        <CalibrationChart data={filteredData} />
                    </div>
                </div>

                {/* 2. Velocity */}
                <div className="lg:col-span-2 bg-black border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 z-10 relative">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Decision Velocity</h3>
                        <span className="text-fluid-3xs text-zinc-600 font-mono">WEEKLY VOLUME</span>
                    </div>
                    <div className="h-[120px] sm:h-[140px] lg:h-[160px] w-full relative z-0">
                        <VelocityChart data={filteredData} />
                    </div>
                </div>

                {/* 3. Outcomes */}
                <div className="md:col-span-2 lg:col-span-1 bg-black border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 z-10 relative">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Outcome Scorecard</h3>
                        <span className="text-fluid-3xs text-zinc-600 font-mono">REVIEWED ONLY</span>
                    </div>
                    <div className="h-[120px] sm:h-[140px] lg:h-[160px] w-full relative z-0">
                        <OutcomeDistribution data={filteredData} />
                    </div>
                </div>
            </div>
        </div>
    );
}

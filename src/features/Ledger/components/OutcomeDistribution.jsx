import React, { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { cssVar, resolveColor, tokenColor } from '@/lib/tokens';

export function OutcomeDistribution({ data }) {
    // Recharts takes colour as plain strings, not classes — resolve the
    // design tokens at render time instead of hardcoding hex/rgba literals.
    // Resolved (not raw `var(--x)`) because Recharts applies these as SVG
    // presentation attributes, where var() is not supported. (--border
    // matches the legacy dark-gray hairline this replaced, at 60% opacity.)
    const gridStroke = resolveColor(cssVar('--border'));
    const axisTick = resolveColor(cssVar('--subtle-foreground'));
    const dotGlow = tokenColor('--pure', 0.5);

    const { chartData } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], total: 0 };

        const counts = { success: 0, mixed: 0, failure: 0 };
        let total = 0;

        data.forEach(d => {
            if (d.status === 'reviewed' && d.outcomeStatus) {
                if (counts[d.outcomeStatus] !== undefined) {
                    counts[d.outcomeStatus]++;
                    total++;
                }
            }
        });

        if (total === 0) return { chartData: [], total: 0 };

        const chartData = Object.keys(counts).map(key => ({
            subject: key.charAt(0).toUpperCase() + key.slice(1),
            value: counts[key],
            percent: Math.round((counts[key] / total) * 100),
            fullMark: total
        }));

        return { chartData, total };

    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-faint-foreground text-xs uppercase tracking-wider">
                No reviews yet
            </div>
        );
    }

    return (
        <div className="h-full w-full relative text-foreground">
            {/* Radar Chart - fills full height */}
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="62%"
                    data={chartData}
                    margin={{ top: 16, right: 28, bottom: 28, left: 28 }}
                >
                    {/* --border is white@10% */}
                    <PolarGrid stroke={gridStroke} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: axisTick, fontSize: 8, fontFamily: 'monospace' }}
                    />
                    <Radar
                        dataKey="value"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        fill="currentColor"
                        fillOpacity={0.06}
                        dot={{ fill: 'currentColor', r: 3, filter: `drop-shadow(0 0 3px ${dotGlow})` }}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-popover/90 border border-border rounded-lg px-2 py-1 text-xs shadow-xl backdrop-blur-md uppercase font-bold tracking-wider text-foreground">
                                        {d.subject}: {d.value}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </RadarChart>
            </ResponsiveContainer>

            {/* Legend - absolute overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2">
                {chartData.map(d => (
                    <div key={d.subject} className="flex items-center gap-1.5 text-xs tracking-wider uppercase">
                        <span className="text-subtle-foreground font-bold">{d.subject}</span>
                        <span className="text-subtle-foreground tabular-nums">{d.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

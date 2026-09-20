import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { cssVar, resolveColor, tokenColor } from '@/lib/tokens';

export function CalibrationChart({ data }) {
    // Recharts takes colour as plain strings, not classes — resolve the
    // design tokens at render time instead of hardcoding hex/rgba literals.
    // Resolved (not raw `var(--x)`) because Recharts applies these as SVG
    // presentation attributes, where var() is not supported.
    const axisTick = resolveColor(cssVar('--subtle-foreground'));
    const cursorStroke = resolveColor(cssVar('--overlay-subtle'));
    const dotGlow = tokenColor('--pure', 0.5);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const reviewed = data.filter(d => d.status === 'reviewed' && typeof d.confidence === 'number');
        if (reviewed.length === 0) return [];

        const buckets = {};
        for (let i = 0; i <= 100; i += 10) {
            buckets[i] = { total: 0, successful: 0, confidenceSum: 0 };
        }

        reviewed.forEach(d => {
            const bucketKey = Math.floor(d.confidence / 10) * 10;
            if (buckets[bucketKey]) {
                buckets[bucketKey].total++;
                buckets[bucketKey].confidenceSum += d.confidence;
                if (d.outcomeStatus === 'success') {
                    buckets[bucketKey].successful++;
                }
            }
        });

        return Object.keys(buckets)
            .map(k => {
                const b = buckets[k];
                if (b.total === 0) return null;
                return {
                    avgConfidence: Math.round(b.confidenceSum / b.total),
                    actualSuccess: Math.round((b.successful / b.total) * 100),
                    count: b.total
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.avgConfidence - b.avgConfidence);
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-faint-foreground text-xs uppercase tracking-wider">
                Not enough data
            </div>
        );
    }

    return (
        <div className="h-full w-full text-foreground">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 12 }}>
                    <defs>
                        <linearGradient id="calibrationGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="avgConfidence"
                        type="number"
                        domain={[10, 100]}
                        ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: axisTick, fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                        padding={{ left: 8, right: 8 }}
                    />
                    <Tooltip
                        cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-popover/90 border border-border rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-md">
                                        <div className="text-muted-foreground mb-1">{d.count} {d.count === 1 ? 'Decision' : 'Decisions'}</div>
                                        <div className="flex gap-3 text-foreground">
                                            <span className="text-muted-foreground">Exp <span className="text-foreground font-bold tabular-nums">{d.avgConfidence}%</span></span>
                                            <span className="text-muted-foreground">Act <span className="text-foreground font-bold tabular-nums">{d.actualSuccess}%</span></span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="actualSuccess"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        fill="url(#calibrationGradient)"
                        dot={{ fill: 'currentColor', r: 2, strokeWidth: 0 }}
                        activeDot={{ fill: 'currentColor', r: 4, strokeWidth: 0, filter: `drop-shadow(0 0 4px ${dotGlow})` }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

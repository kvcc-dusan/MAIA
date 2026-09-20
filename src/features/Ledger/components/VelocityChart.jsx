import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { cssVar, resolveColor, tokenColor } from '@/lib/tokens';

export function VelocityChart({ data }) {
    // Recharts takes colour as plain strings, not classes — resolve the
    // design tokens at render time instead of hardcoding hex/rgba literals.
    // Resolved (not raw `var(--x)`) because Recharts applies these as SVG
    // presentation attributes, where var() is not supported.
    const axisTick = resolveColor(cssVar('--subtle-foreground'));
    const cursorStroke = resolveColor(cssVar('--overlay-subtle'));
    const dotGlow = tokenColor('--pure', 0.5);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Bucket by week (last 12 weeks)
        const weeks = {};
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setHours(0, 0, 0, 0);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() - (i * 7));
            const key = d.toISOString().split('T')[0];
            weeks[key] = { date: key, count: 0, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
        }

        data.forEach(d => {
            const date = new Date(d.createdAt);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - start.getDay());
            const key = start.toISOString().split('T')[0];
            if (weeks[key]) weeks[key].count++;
        });

        return Object.values(weeks).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-faint-foreground text-xs uppercase tracking-wider">
                No activity
            </div>
        );
    }

    return (
        <div className="h-full w-full text-foreground">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 12 }}>
                    <defs>
                        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        minTickGap={20}
                        tick={{ fill: axisTick, fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        padding={{ left: 8, right: 8 }}
                    />
                    <Tooltip
                        cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-popover/90 border border-border rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-md">
                                        <div className="text-muted-foreground mb-1">{d.label}</div>
                                        <div className="text-foreground font-bold tabular-nums">{d.count} {d.count === 1 ? 'Decision' : 'Decisions'}</div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        fill="url(#velocityGradient)"
                        dot={{ fill: 'currentColor', r: 2, strokeWidth: 0 }}
                        activeDot={{ fill: 'currentColor', r: 4, strokeWidth: 0, filter: `drop-shadow(0 0 4px ${dotGlow})` }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

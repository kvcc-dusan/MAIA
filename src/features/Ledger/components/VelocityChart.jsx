import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

export function VelocityChart({ data }) {
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
            <div className="h-full w-full flex items-center justify-center text-zinc-700 text-[10px] uppercase font-mono tracking-wider">
                No activity
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#93FD23" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#93FD23" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        minTickGap={24}
                        tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 text-[10px] shadow-xl backdrop-blur-md">
                                        <div className="text-zinc-500 mb-1">{d.label}</div>
                                        <div className="text-white font-bold">{d.count} {d.count === 1 ? 'Decision' : 'Decisions'}</div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#93FD23"
                        strokeWidth={1.5}
                        fill="url(#velocityGradient)"
                        dot={{ fill: '#93FD23', r: 2, strokeWidth: 0 }}
                        activeDot={{ fill: '#93FD23', r: 4, strokeWidth: 0, filter: 'drop-shadow(0 0 4px #93FD23)' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

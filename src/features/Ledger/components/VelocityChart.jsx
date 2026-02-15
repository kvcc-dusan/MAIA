import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { cn } from "@/lib/utils";

export function VelocityChart({ data }) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Bucket by week (last 12 weeks)
        const weeks = {};
        const now = new Date();
        // Reset to start of current week (Sunday)
        const currentWeekStart = new Date(now);
        currentWeekStart.setHours(0, 0, 0, 0);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

        // Initialize last 12 weeks
        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() - (i * 7));
            const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
            weeks[key] = { date: key, count: 0, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
        }

        data.forEach(d => {
            const date = new Date(d.createdAt);
            // Find start of that week
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - start.getDay());
            const key = start.toISOString().split('T')[0];

            if (weeks[key]) {
                weeks[key].count++;
            }
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
                <BarChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                        dataKey="label"
                        interval={2} // Show every 3rd label
                        tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 text-[10px] shadow-xl backdrop-blur-md">
                                        <div className="text-zinc-500 mb-1">{d.label}</div>
                                        <div className="text-white font-bold">{d.count} Decisions</div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3f3f46' : '#27272a'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

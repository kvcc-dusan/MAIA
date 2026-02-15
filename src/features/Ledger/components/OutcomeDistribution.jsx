import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = {
    success: '#10b981', // emerald-500
    mixed: '#face15',   // yellow-400
    failure: '#ef4444'  // red-500
};

export function OutcomeDistribution({ data }) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

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

        if (total === 0) return [];

        return Object.keys(counts).map(key => ({
            name: key,
            value: counts[key],
            percent: Math.round((counts[key] / total) * 100)
        })).filter(d => d.value > 0);

    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-zinc-700 text-[10px] uppercase font-mono tracking-wider">
                No reviews yet
            </div>
        );
    }

    return (
        <div className="h-full w-full flex items-center gap-4">
            {/* Simple Donut */}
            <div className="h-full aspect-square relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={"60%"}
                            outerRadius={"90%"}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[10px] shadow-xl backdrop-blur-md uppercase font-bold tracking-wider text-white">
                                            {d.name}: {d.value}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Label (Total) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-zinc-500 font-mono">
                        {chartData.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2 justify-center flex-1">
                {chartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[d.name] }} />
                            {d.name}
                        </div>
                        <div className="text-white font-bold">{d.percent}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

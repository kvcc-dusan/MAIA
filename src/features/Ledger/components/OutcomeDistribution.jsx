import React, { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = {
    success: '#93FD23',
    mixed: '#FEEE08',
    failure: '#FE083D'
};

export function OutcomeDistribution({ data }) {
    const { chartData, total } = useMemo(() => {
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
            <div className="h-full w-full flex items-center justify-center text-zinc-700 text-[10px] uppercase font-mono tracking-wider">
                No reviews yet
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {/* Radar Chart - fills full height */}
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="55%" outerRadius="85%" data={chartData}>
                    <PolarGrid stroke="#333" opacity={0.3} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#71717a', fontSize: 8, fontFamily: 'monospace' }}
                    />
                    <Radar
                        dataKey="value"
                        stroke="#d4d4d8"
                        strokeWidth={1.5}
                        fill="#d4d4d8"
                        fillOpacity={0.08}
                        dot={{ fill: '#d4d4d8', r: 3 }}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[10px] shadow-xl backdrop-blur-md uppercase font-bold tracking-wider text-white">
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
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4">
                {chartData.map(d => (
                    <div key={d.subject} className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[d.subject.toLowerCase()] }} />
                        <span className="text-white font-bold">{d.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

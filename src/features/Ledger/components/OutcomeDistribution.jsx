import React, { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { cn } from "@/lib/utils";


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
            <div className="h-full w-full flex items-center justify-center text-zinc-700 text-fluid-3xs uppercase font-mono tracking-wider">
                No reviews yet
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {/* Radar Chart - fills full height */}
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="55%" outerRadius="85%" data={chartData}>
                    <PolarGrid stroke="#27272a" opacity={0.6} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#52525b', fontSize: 8, fontFamily: 'monospace' }}
                    />
                    <Radar
                        dataKey="value"
                        stroke="#93FD23"
                        strokeWidth={1.5}
                        fill="#93FD23"
                        fillOpacity={0.06}
                        dot={{ fill: '#93FD23', r: 3, filter: 'drop-shadow(0 0 3px #93FD23)' }}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-fluid-3xs shadow-xl backdrop-blur-md uppercase font-bold tracking-wider text-white">
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
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5">
                {chartData.map(d => (
                    <div key={d.subject} className="flex items-center gap-1.5 text-fluid-3xs font-mono tracking-wider uppercase">
                        <span className="text-zinc-600 font-bold">{d.subject}</span>
                        <span className="text-zinc-600">{d.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

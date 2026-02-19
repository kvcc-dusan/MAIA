import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

export function CalibrationChart({ data }) {
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
            <div className="h-full w-full flex items-center justify-center text-zinc-700 font-mono text-[10px] uppercase tracking-wider">
                Not enough data
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="calibrationGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#93FD23" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#93FD23" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="avgConfidence"
                        type="number"
                        domain={[10, 100]}
                        ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                        tickFormatter={(v) => `${v}%`}
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
                                        <div className="text-zinc-500 mb-1">{d.count} {d.count === 1 ? 'Decision' : 'Decisions'}</div>
                                        <div className="flex gap-3 text-white">
                                            <span className="text-zinc-500">Exp <span className="text-white font-bold">{d.avgConfidence}%</span></span>
                                            <span className="text-zinc-500">Act <span className="text-white font-bold">{d.actualSuccess}%</span></span>
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
                        stroke="#93FD23"
                        strokeWidth={1.5}
                        fill="url(#calibrationGradient)"
                        dot={{ fill: '#93FD23', r: 2, strokeWidth: 0 }}
                        activeDot={{ fill: '#93FD23', r: 4, strokeWidth: 0, filter: 'drop-shadow(0 0 4px #93FD23)' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

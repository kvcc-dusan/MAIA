import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { cn } from "@/lib/utils";



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
            <div className="h-full w-full flex flex-col items-center justify-center text-zinc-700 font-mono text-[10px] uppercase tracking-wider">
                <span>Not enough data</span>
            </div>
        );
    }



    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} vertical={false} />
                    <XAxis
                        dataKey="avgConfidence"
                        type="number"
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={{ stroke: '#333', opacity: 0.2 }}
                    />
                    <YAxis
                        type="number"
                        domain={[0, 100]}
                        ticks={[0, 50, 100]}
                        tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-black/90 border border-white/10 rounded-lg p-3 text-[10px] shadow-2xl backdrop-blur-md">
                                        <div className="text-zinc-400 mb-1 font-mono uppercase tracking-wider">{d.count} Decisions</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-200">
                                            <span className="text-zinc-500">Exp:</span>
                                            <span className="font-bold">{d.avgConfidence}%</span>
                                            <span className="text-zinc-500">Act:</span>
                                            <span className="font-bold text-zinc-300">{d.actualSuccess}%</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    {/* Perfect Calibration Line */}
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#52525b" strokeDasharray="3 3" opacity={0.5} />

                    <Line
                        type="monotone"
                        dataKey="actualSuccess"
                        stroke="#71717a"
                        strokeWidth={1.5}
                        dot={{ fill: '#71717a', r: 4, strokeWidth: 0 }}
                        activeDot={{ fill: '#71717a', r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { cn } from "@/lib/utils";

/**
 * ActivityGrid: A GitHub-style contribution graph roughly visualizing momentum over the last 60 days.
 */
export default function ActivityGrid({ project }) {
    const { tasks, sessions } = useData();

    // Helper: Local YYYY-MM-DD key to avoid UTC shifts
    const toDateKey = (d) => {
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 1. Generate last 84 days (approx 3 months or 12 weeks for better grid)
    const days = useMemo(() => {
        const d = [];
        const today = new Date();
        for (let i = 83; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            d.push({
                date,
                iso: toDateKey(date),
            });
        }
        return d;
    }, []);

    // 2. Aggregate Activity
    const activityMap = useMemo(() => {
        const map = {};
        tasks.filter(t => t.projectId === project.id && t.done && t.completedAt).forEach(t => {
            const key = toDateKey(t.completedAt);
            map[key] = (map[key] || 0) + 1;
        });
        sessions.filter(s => s.projectId === project.id).forEach(s => {
            const key = toDateKey(s.start);
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [tasks, sessions, project.id]);

    const streak = useMemo(() => {
        let s = 0;
        const todayKey = toDateKey(new Date());
        if (activityMap[todayKey] > 0) s++;

        // Check yesterday and back
        for (let i = 1; i < 90; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = toDateKey(d);

            if (activityMap[key] > 0) s++;
            else if (i === 1 && s === 0) {
                // If today is 0, but yesterday is active, allow streak to start from yesterday
                // But wait, standard streak logic:
                // If I did something yesterday (1) and nothing today (0), my streak is 1.
                // My loop logic:
                // todayKey (0) -> s=0.
                // i=1 (yesterday) -> activity > 0 -> s++ -> s=1.
                // i=2 (day before) -> no activity -> break.
                // Result: 1. Correct.
                // So simple check is fine.
            }
            else break;
        }
        return s;
    }, [activityMap]);

    const totalActions = Object.values(activityMap).reduce((a, b) => a + b, 0);

    return (
        <div className="h-full flex flex-col p-6 rounded-2xl bg-black border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full", streak > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-700")} />
                        Momentum
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                        {streak} day streak
                    </span>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                    {totalActions} actions (last 90d)
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex-1 min-h-[60px] flex flex-wrap content-start gap-1">
                {days.map((day) => {
                    const count = activityMap[day.iso] || 0;
                    // Heatmap Color Scale (Subtle)
                    let bgClass = "bg-white/5 border-transparent";
                    if (count >= 1) bgClass = "bg-emerald-900/40 border-emerald-500/20";
                    if (count >= 2) bgClass = "bg-emerald-800/60 border-emerald-500/30";
                    if (count >= 4) bgClass = "bg-emerald-600/80 border-emerald-400/40";
                    if (count >= 6) bgClass = "bg-emerald-400 border-emerald-300 shadow-[0_0_4px_theme(colors.emerald.500)]";

                    return (
                        <div
                            key={day.iso}
                            className={cn(
                                "w-3 h-3 rounded-[2px] border transition-all duration-300 hover:scale-125 hover:z-10 relative group cursor-default",
                                bgClass
                            )}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-zinc-200 text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {count} actions
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

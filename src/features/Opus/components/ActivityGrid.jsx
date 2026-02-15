import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { cn } from "@/lib/utils";

/**
 * ActivityGrid: A GitHub-style contribution graph visualizing momentum over the past year.
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

    // Generate last 365 days, aligned to start on a Sunday (like GitHub)
    const { weeks, monthLabels } = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun
        // Go back 52 full weeks + remaining days to start on Sunday
        const totalDays = 52 * 7 + dayOfWeek + 1;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - totalDays + 1);

        const allDays = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            allDays.push({
                date,
                iso: toDateKey(date),
                dayOfWeek: date.getDay(),
            });
        }

        // Group into weeks (columns)
        const weeks = [];
        let currentWeek = [];
        for (const day of allDays) {
            currentWeek.push(day);
            if (day.dayOfWeek === 6) { // Saturday = end of week
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);

        // Generate month labels
        const monthLabels = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let lastMonth = -1;
        weeks.forEach((week, weekIdx) => {
            const firstDay = week[0];
            const month = firstDay.date.getMonth();
            if (month !== lastMonth) {
                monthLabels.push({ weekIdx, label: monthNames[month] });
                lastMonth = month;
            }
        });

        return { weeks, monthLabels };
    }, []);

    // Aggregate Activity
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

        for (let i = 1; i < 365; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = toDateKey(d);
            if (activityMap[key] > 0) s++;
            else if (i === 1 && s === 0) continue; // allow streak from yesterday
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
                        <span className={cn("w-1.5 h-1.5 rounded-full", streak > 0 ? "bg-[#93FD23] animate-pulse" : "bg-zinc-700")} />
                        Momentum
                    </span>
                    <span className="text-[10px] text-[#93FD23]/80 font-mono bg-[#93FD23]/10 px-1.5 py-0.5 rounded border border-[#93FD23]/10">
                        {streak} day streak
                    </span>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                    {totalActions} actions
                </div>
            </div>

            {/* Month Labels */}
            <div className="flex mb-1 ml-0">
                <div className="flex relative w-full" style={{ height: '12px' }}>
                    {monthLabels.map((m, i) => (
                        <span
                            key={i}
                            className="absolute text-[8px] text-zinc-600 font-mono"
                            style={{ left: `${(m.weekIdx / weeks.length) * 100}%` }}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Heatmap Grid - 7 rows × N columns */}
            <div className="flex-1 min-h-[70px] overflow-x-auto custom-scrollbar">
                <div className="flex gap-[2px]" style={{ width: 'max-content' }}>
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-[2px]">
                            {/* Fill empty slots for incomplete first week */}
                            {week[0].dayOfWeek !== 0 && weekIdx === 0 && (
                                Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} className="w-[10px] h-[10px]" />
                                ))
                            )}
                            {week.map((day) => {
                                const count = activityMap[day.iso] || 0;
                                let bgClass = "bg-white/5";
                                if (count >= 1) bgClass = "bg-[#93FD23]/15";
                                if (count >= 2) bgClass = "bg-[#93FD23]/30";
                                if (count >= 4) bgClass = "bg-[#93FD23]/50";
                                if (count >= 6) bgClass = "bg-[#93FD23]/80 shadow-[0_0_3px_rgba(147,253,35,0.4)]";

                                return (
                                    <div
                                        key={day.iso}
                                        className={cn(
                                            "w-[10px] h-[10px] rounded-[2px] transition-all duration-200 hover:scale-150 hover:z-10 relative group cursor-default",
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
                    ))}
                </div>
            </div>
        </div>
    );
}

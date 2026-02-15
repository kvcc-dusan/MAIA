import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { cn } from "@/lib/utils";

export function useProjectVitality(project) {
    const { tasks, sessions } = useData();

    return useMemo(() => {
        // 1. Collect Valid Activity
        const timestamps = [];
        const uniqueDays = new Set();
        const toDateStr = (ts) => new Date(ts).toISOString().split('T')[0];

        // Tasks
        tasks.filter(t => t.projectId === project.id).forEach(t => {
            if (t.createdAt) {
                const ts = new Date(t.createdAt).getTime();
                timestamps.push(ts);
                uniqueDays.add(toDateStr(ts));
            }
            if (t.done && t.completedAt) {
                const ts = new Date(t.completedAt).getTime();
                timestamps.push(ts);
                uniqueDays.add(toDateStr(ts));
            }
        });

        // Sessions
        sessions.filter(s => s.projectId === project.id).forEach(s => {
            if (s.start) {
                const ts = new Date(s.start).getTime();
                timestamps.push(ts);
                uniqueDays.add(toDateStr(ts));
            }
        });

        // 2. State Machine Logic

        // State: COLD (Default / Start)
        // If no activity ever, it's Cold (User request: "When I create project it is called cold")
        if (timestamps.length === 0) {
            return { status: 'Cold', color: 'text-zinc-500', bg: 'bg-zinc-500' };
        }

        const lastActive = Math.max(...timestamps);
        const diffDays = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);

        // State: DORMANT (> 30 days inactivity)
        if (diffDays > 30) {
            return { status: 'Dormant', color: 'text-zinc-700', bg: 'bg-zinc-700' };
        }

        // State: COLD (> 10 days inactivity)
        if (diffDays > 10) {
            return { status: 'Cold', color: 'text-zinc-500', bg: 'bg-zinc-500' };
        }

        // State: HIGH TEMPO (Active > 3 days)
        // We define "Active" as recently touched. "More than 3 days" implies consistency.
        // Let's check if there are activity on >= 3 unique days in the last 7 days.
        const recentActivityDays = Array.from(uniqueDays)
            .filter(pc => {
                const pcDate = new Date(pc).getTime();
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                return pcDate >= sevenDaysAgo;
            });

        if (recentActivityDays.length >= 3) {
            return { status: 'High Tempo', color: 'text-orange-500', bg: 'bg-orange-500', animate: true };
        }

        // State: ACTIVE (Default if activity < 10 days ago but not high tempo)
        return { status: 'Active', color: 'text-[#93FD23]', bg: 'bg-[#93FD23]' };

    }, [project, tasks, sessions]);
}

export default function ProjectVitality({ project }) {
    const { status, color, bg, animate } = useProjectVitality(project);

    return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            <span className={cn(
                "w-2 h-2 rounded-full",
                bg,
                animate && "animate-pulse shadow-[0_0_8px_currentColor]"
            )} />
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                color
            )}>
                {status}
            </span>
        </div>
    );
}

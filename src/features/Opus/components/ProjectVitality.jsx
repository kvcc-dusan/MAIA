import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { cn } from "@/lib/utils";

export function useProjectVitality(project) {
    const { tasks, sessions } = useData();

    return useMemo(() => {
        // Collect timestamps
        const timestamps = [];

        // Last completed task
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        projectTasks.forEach(t => {
            if (t.createdAt) timestamps.push(new Date(t.createdAt).getTime());
            if (t.done && t.completedAt) timestamps.push(new Date(t.completedAt).getTime()); // Assuming we track completedAt
        });

        // Last session
        const projectSessions = sessions.filter(s => s.projectId === project.id);
        projectSessions.forEach(s => {
            if (s.end) timestamps.push(new Date(s.end).getTime());
            else if (s.start) timestamps.push(new Date(s.start).getTime());
        });

        if (timestamps.length === 0) return { status: 'Dormant', color: 'text-zinc-600', bg: 'bg-zinc-600' };

        const lastActive = Math.max(...timestamps);
        const diffHours = (Date.now() - lastActive) / (1000 * 60 * 60);

        if (diffHours < 24) return { status: 'High Tempo', color: 'text-emerald-400', bg: 'bg-emerald-400', animate: true };
        if (diffHours < 24 * 7) return { status: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-600' }; // Warm
        if (diffHours < 24 * 30) return { status: 'Cold', color: 'text-amber-500', bg: 'bg-amber-500' };

        return { status: 'Dormant', color: 'text-zinc-600', bg: 'bg-zinc-600' };

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

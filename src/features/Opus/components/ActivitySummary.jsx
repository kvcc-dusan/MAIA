import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ActivitySummary — Compact project stats replacing full heatmap
 * Shows: Last action, 7-day count, trend indicator
 */
export default function ActivitySummary({ project }) {
    const { tasks, sessions } = useData();

    const stats = useMemo(() => {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        // Collect all timestamps for this project
        const timestamps = [];

        tasks.filter(t => t.projectId === project.id).forEach(t => {
            if (t.completedAt) timestamps.push(new Date(t.completedAt).getTime());
            if (t.createdAt) timestamps.push(new Date(t.createdAt).getTime());
        });

        sessions.filter(s => s.projectId === project.id).forEach(s => {
            if (s.start) timestamps.push(new Date(s.start).getTime());
        });

        // Last action
        const lastAction = timestamps.length > 0 ? Math.max(...timestamps) : null;
        let lastActionLabel = 'Never';
        if (lastAction) {
            const diffDays = Math.floor((now - lastAction) / day);
            if (diffDays === 0) lastActionLabel = 'Today';
            else if (diffDays === 1) lastActionLabel = 'Yesterday';
            else lastActionLabel = `${diffDays}d ago`;
        }

        // 7-day counts
        const last7d = timestamps.filter(t => (now - t) < 7 * day).length;
        const prev7d = timestamps.filter(t => (now - t) >= 7 * day && (now - t) < 14 * day).length;

        // Trend
        let trend = 'stable';
        if (last7d > prev7d + 1) trend = 'increasing';
        else if (last7d < prev7d - 1) trend = 'declining';

        return { lastActionLabel, last7d, trend };
    }, [tasks, sessions, project.id]);

    const trendConfig = {
        increasing: { icon: TrendingUp, label: '↑', color: 'text-[#93FD23]' },
        stable: { icon: Minus, label: '→', color: 'text-zinc-600' },
        declining: { icon: TrendingDown, label: '↓', color: 'text-red-400' },
    };

    const { color: trendColor } = trendConfig[stats.trend];

    return (
        <div className="flex items-center gap-4 text-fluid-3xs font-mono text-zinc-600">
            <span className="flex items-center gap-1">
                <Zap size={10} className="text-zinc-700" />
                {stats.lastActionLabel}
            </span>
            <span>{stats.last7d} / 7d</span>
            <span className={cn("font-bold", trendColor)}>
                {trendConfig[stats.trend].label}
            </span>
        </div>
    );
}

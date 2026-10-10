import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { Zap } from "lucide-react";

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
            const doneAt = t.doneAt ?? t.completedAt;
            if (doneAt) timestamps.push(new Date(doneAt).getTime());
            if (t.createdAt) timestamps.push(new Date(t.createdAt).getTime());
        });

        sessions.filter(s => s.linkedProjectId === project.id).forEach(s => {
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

    const trendLabel = { increasing: 'Rising', stable: 'Steady', declining: 'Falling' }[stats.trend];

    return (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
                <Zap size={12} strokeWidth={1.75} aria-hidden="true" />
                {stats.lastActionLabel}
            </span>
            <span>{stats.last7d} in 7 days</span>
            <span>{trendLabel}</span>
        </div>
    );
}

import React, { useMemo } from 'react';
import { useData } from "../../../context/DataContext";
import { Badge } from "@/components/arc/badge/badge.jsx";

// Internal hook — not exported: react-refresh requires components-only
// exports from component files.
function useProjectVitality(project) {
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
            if (t.done && (t.doneAt ?? t.completedAt)) {
                const ts = new Date(t.doneAt ?? t.completedAt).getTime();
                timestamps.push(ts);
                uniqueDays.add(toDateStr(ts));
            }
        });

        // Sessions
        sessions.filter(s => s.linkedProjectId === project.id).forEach(s => {
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
            return { status: 'Cold', tone: 'neutral' };
        }

        const lastActive = Math.max(...timestamps);
        const diffDays = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);

        // State: DORMANT (> 30 days inactivity)
        if (diffDays > 30) {
            return { status: 'Dormant', tone: 'neutral' };
        }

        // State: COLD (> 10 days inactivity)
        if (diffDays > 10) {
            return { status: 'Cold', tone: 'neutral' };
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
            return { status: 'High tempo', tone: 'info' };
        }

        // State: ACTIVE (Default if activity < 10 days ago but not high tempo)
        return { status: 'Active', tone: 'success' };

    }, [project, tasks, sessions]);
}

export default function ProjectVitality({ project }) {
    const { status, tone } = useProjectVitality(project);
    // The label carries the meaning; tone is only a cue (rules: status never by color alone).
    return <Badge tone={tone} size="sm">{status}</Badge>;
}

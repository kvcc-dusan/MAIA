import { useMemo } from 'react';
import { BarChart } from '@/components/arc/bar-chart/bar-chart';
import { EmptyState } from '@/components/composed/EmptyState';
import { Button } from '@/components/arc/button/button';

const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const weekStart = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return date;
};

// Local-date key: toISOString would shift the week across midnight in UTC+ zones.
const keyOf = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const fmt = (date, options) => date.toLocaleDateString(undefined, options);

/**
 * Decisions logged per week over the last 12 weeks.
 * Arc bar-chart: a scrubbable value (hover, focus, arrow keys), a dashed
 * average line, a screen-reader table, and theme-aware colours via CSS vars.
 */
export function VelocityChart({ data, onLog }) {
    const { bars, period } = useMemo(() => {
        const current = weekStart(new Date());
        const buckets = new Map();
        const list = [];

        for (let i = WEEKS - 1; i >= 0; i--) {
            const start = new Date(current);
            start.setDate(start.getDate() - i * 7);
            const bucket = {
                key: keyOf(start),
                label: `Week of ${fmt(start, { month: 'short', day: 'numeric' })}`,
                // Every other week gets a tick so labels never collide on narrow cards.
                axisLabel: (WEEKS - 1 - i) % 2 === 0 ? fmt(start, { month: 'short', day: 'numeric' }) : undefined,
                value: 0,
            };
            buckets.set(bucket.key, bucket);
            list.push(bucket);
        }

        (data || []).forEach((d) => {
            const bucket = buckets.get(keyOf(weekStart(d.createdAt)));
            if (bucket) bucket.value += 1;
        });

        const first = new Date(current.getTime() - (WEEKS - 1) * 7 * DAY_MS);
        return {
            bars: list,
            period: `${fmt(first, { month: 'short', day: 'numeric' })} to ${fmt(new Date(), { month: 'short', day: 'numeric' })}`,
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <EmptyState
                title="No activity yet"
                description="Log a decision to start tracking how often you decide."
                action={onLog ? <Button size="sm" variant="secondary" onClick={onLog}>Log decision</Button> : undefined}
            />
        );
    }

    return (
        <BarChart
            data={bars}
            label="Decisions logged per week"
            period={period}
            unit="decisions"
            averageLabel="Weekly average"
            valueLabel="Decisions"
            categoryLabel="Week"
        />
    );
}

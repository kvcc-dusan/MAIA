import { useMemo } from 'react';
import { DonutChart } from '@/components/arc/donut-chart/donut-chart';
import { EmptyState } from '@/components/composed/EmptyState';
import { OUTCOME_LABEL } from './decisionStyles';

// Outcome is a real status, so these use the status tokens rather than
// --series-N. Each segment is also named in the legend and the data table.
const OUTCOME_COLOR = {
    success: 'var(--success)',
    mixed: 'var(--warning)',
    failure: 'var(--danger)',
};

/**
 * Reviewed decisions by result. Replaces the Recharts radar: Arc donut-chart
 * shows the same three counts, with a legend that doubles as the keyboard path.
 */
export function OutcomeDistribution({ data }) {
    const slices = useMemo(() => {
        const counts = { success: 0, mixed: 0, failure: 0 };
        (data || []).forEach((d) => {
            if (d.status === 'reviewed' && counts[d.outcomeStatus] !== undefined) counts[d.outcomeStatus] += 1;
        });
        return Object.keys(counts)
            .map((key) => ({ key, label: OUTCOME_LABEL[key], value: counts[key], color: OUTCOME_COLOR[key] }))
            .filter((s) => s.value > 0);
    }, [data]);

    if (slices.length === 0) {
        return (
            <EmptyState
                title="No reviews yet"
                description="Review an open decision to see how your outcomes split."
            />
        );
    }

    return (
        <DonutChart
            data={slices}
            label="Reviewed decisions by outcome"
            unit="reviews"
            totalLabel="Reviewed"
            maxSegments={3}
            groupBelow={0}
        />
    );
}

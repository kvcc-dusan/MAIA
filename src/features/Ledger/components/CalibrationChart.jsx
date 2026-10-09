import { useMemo } from 'react';
import { LineChart } from '@/components/arc/line-chart/line-chart';
import { EmptyState } from '@/components/composed/EmptyState';

const SERIES = [
    { key: 'actual', label: 'Actual success rate', color: 'var(--series-1)', area: true },
    { key: 'expected', label: 'Your confidence', color: 'var(--series-2)', dashed: true, area: false },
];

const percent = (value) => `${Math.round(value)}%`;

/**
 * Stated confidence vs. how often decisions actually worked out, bucketed by
 * confidence. The dashed line is what perfect calibration would look like.
 * Arc line-chart: scrubbable crosshair, legend toggles, data table for
 * screen readers. (Recharts area chart before.)
 */
export function CalibrationChart({ data }) {
    const points = useMemo(() => {
        const reviewed = (data || []).filter((d) => d.status === 'reviewed' && typeof d.confidence === 'number');
        if (reviewed.length === 0) return [];

        const buckets = new Map();
        reviewed.forEach((d) => {
            const bucketKey = Math.floor(d.confidence / 10) * 10;
            const bucket = buckets.get(bucketKey) || { total: 0, successful: 0, confidenceSum: 0 };
            bucket.total += 1;
            bucket.confidenceSum += d.confidence;
            if (d.outcomeStatus === 'success') bucket.successful += 1;
            buckets.set(bucketKey, bucket);
        });

        return [...buckets.entries()]
            .map(([bucketKey, b]) => {
                const avgConfidence = Math.round(b.confidenceSum / b.total);
                return {
                    key: `bucket-${bucketKey}`,
                    label: `${avgConfidence}% confident, ${b.total} ${b.total === 1 ? 'decision' : 'decisions'}`,
                    axisLabel: percent(avgConfidence),
                    avgConfidence,
                    values: { actual: Math.round((b.successful / b.total) * 100), expected: avgConfidence },
                };
            })
            .sort((a, b) => a.avgConfidence - b.avgConfidence);
    }, [data]);

    if (points.length < 2) {
        return (
            <EmptyState
                title="Not enough data"
                description="Review decisions made at different confidence levels to see how well you predict."
            />
        );
    }

    return (
        <LineChart
            data={points}
            series={SERIES}
            label="Actual success rate by confidence"
            unit="%"
            categoryLabel="Confidence"
            formatValue={(value) => percent(value)}
            formatTick={percent}
        />
    );
}

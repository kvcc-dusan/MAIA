import { useId, useState, useMemo } from 'react';
import { SectionCard } from "@/components/composed/SectionCard";
import { CountPill } from "@/components/composed/SectionBits";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Switch } from "@/components/arc/switch/switch";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import { CalibrationChart } from './CalibrationChart';
import { VelocityChart } from './VelocityChart';
import { OutcomeDistribution } from './OutcomeDistribution';
import styles from './JudgmentOverview.module.css';

/**
 * Summary numbers plus the Ledger's three chart panels. Cards rest on a
 * hairline border; the chart bodies are Arc charts that size themselves.
 */

const RANGE_OPTIONS = [
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: 'all', label: 'All time' },
];

const RANGE_DAYS = { '30d': 30, '90d': 90 };
const RANGE_CONTEXT = { '30d': 'in the last 30 days', '90d': 'in the last 90 days', all: 'across all time' };

export function JudgmentOverview({ ledger, onLog }) {
    const [timeRange, setTimeRange] = useState('all');
    const [highStakesOnly, setHighStakesOnly] = useState(false);
    const switchId = useId();

    const filteredData = useMemo(() => {
        let data = [...ledger];

        if (timeRange !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - RANGE_DAYS[timeRange]);
            data = data.filter(d => new Date(d.createdAt) >= cutoff);
        }

        if (highStakesOnly) data = data.filter(d => d.stakes === 'high');

        return data;
    }, [ledger, timeRange, highStakesOnly]);

    const total = filteredData.length;
    const reviewed = filteredData.filter(d => d.status === 'reviewed').length;
    const reviewRate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    const scope = `${RANGE_CONTEXT[timeRange]}${highStakesOnly ? ', high stakes' : ''}`;

    return (
        <section className={styles.overview} aria-labelledby={`${switchId}-title`}>
            <div className={styles.header}>
                <div>
                    <h2 id={`${switchId}-title`} className={styles.title}>Judgment overview</h2>
                    <p className={styles.subtitle}>How well your confidence predicts what happens</p>
                </div>

                <div className={styles.filters}>
                    <SegmentedControl
                        label="Time range"
                        options={RANGE_OPTIONS}
                        value={timeRange}
                        onValueChange={setTimeRange}
                    />
                    <label className={styles.toggle} htmlFor={switchId}>
                        <Switch
                            id={switchId}
                            checked={highStakesOnly}
                            onCheckedChange={setHighStakesOnly}
                            aria-label="High stakes only"
                        />
                        <span>High stakes only</span>
                    </label>
                </div>
            </div>

            <div className={styles.metrics}>
                <MetricCard label="Decisions" value={total} context={scope} />
                <MetricCard label="Open" value={total - reviewed} context="waiting for a review" />
                <MetricCard label="Review rate" value={reviewRate} suffix="%" context={`${reviewed} of ${total} reviewed`} />
            </div>

            <div className={styles.charts}>
                <SectionCard title="Confidence calibration" bodyClassName={styles.body}>
                    <CalibrationChart data={filteredData} />
                </SectionCard>

                <SectionCard title="Decision velocity" bodyClassName={styles.body}>
                    <VelocityChart data={filteredData} onLog={onLog} />
                </SectionCard>

                <SectionCard
                    title="Outcome scorecard"
                    count={<CountPill>Reviewed only</CountPill>}
                    bodyClassName={styles.body}
                >
                    <OutcomeDistribution data={filteredData} />
                </SectionCard>
            </div>
        </section>
    );
}

import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Button } from "@/components/arc/button/button";
import { STAKES_DOT } from "./decisionStyles";
import styles from "./LedgerFilters.module.css";

const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'reviewed', label: 'Reviewed' },
];

const dot = (color) => <span className={styles.dot} style={{ backgroundColor: color }} aria-hidden="true" />;

const STAKES_OPTIONS = [
    { value: 'all', label: 'All stakes' },
    { value: 'high', label: 'High', accessory: dot(STAKES_DOT.high) },
    { value: 'medium', label: 'Medium', accessory: dot(STAKES_DOT.medium) },
    { value: 'low', label: 'Low', accessory: dot(STAKES_DOT.low) },
];

const SORT_OPTIONS = [
    { value: 'recent', label: 'Recent' },
    { value: 'az', label: 'A to Z' },
    { value: 'stakes', label: 'Stakes' },
];

/** Status, stakes and sort controls above the decision grid. */
export function LedgerFilters({ status, stakes, sort, isFiltered, onStatus, onStakes, onSort, onClear }) {
    return (
        <div className={styles.bar}>
            <SegmentedControl label="Filter by status" options={STATUS_OPTIONS} value={status} onValueChange={onStatus} />
            <SegmentedControl label="Filter by stakes" options={STAKES_OPTIONS} value={stakes} onValueChange={onStakes} />
            <SegmentedControl label="Sort decisions" options={SORT_OPTIONS} value={sort} onValueChange={onSort} />
            {isFiltered && (
                <Button type="button" variant="ghost" size="sm" onClick={onClear}>Clear filters</Button>
            )}
        </div>
    );
}

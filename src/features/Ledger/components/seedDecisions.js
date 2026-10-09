import { uid } from "@/lib/ids.js";

const STAKES = ['low', 'medium', 'high'];
const REVERSIBILITIES = ['reversible', 'costly', 'irreversible'];

/**
 * Dev-only fixture: 50 fake decisions spread over the last 90 days.
 * LedgerPage replaces the whole ledger with these (behind a confirm dialog
 * and an import.meta.env.DEV guard).
 */
export const buildSeedDecisions = () =>
    Array.from({ length: 50 }).map((_, i) => {
        const isReviewed = Math.random() > 0.3;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));

        const confidence = Math.floor(Math.random() * 10) * 10 + 10;
        let outcomeStatus = 'mixed';

        if (isReviewed) {
            const roll = Math.random();
            const successChance = confidence / 150 + 0.2;
            if (roll < successChance) outcomeStatus = 'success';
            else if (roll < successChance + 0.3) outcomeStatus = 'mixed';
            else outcomeStatus = 'failure';
        }

        return {
            id: uid(),
            createdAt: date.toISOString(),
            title: `Sample decision ${i + 1} (${Math.random().toString(36).substring(7)})`,
            stakes: STAKES[Math.floor(Math.random() * STAKES.length)],
            reversibility: REVERSIBILITIES[Math.floor(Math.random() * REVERSIBILITIES.length)],
            confidence,
            assumptions: ["Assumption 1", "Assumption 2"],
            status: isReviewed ? 'reviewed' : 'open',
            reviewedAt: isReviewed ? new Date().toISOString() : null,
            outcome: isReviewed ? "This was the outcome..." : null,
            outcomeStatus: isReviewed ? outcomeStatus : null
        };
    });

import { useMemo } from "react";
import { calculateVelocity, detectStaleness } from "../lib/analysis/index.js";

/**
 * useSignals — shared signal computation for Today and any future surface.
 * Returns { velocity, staleness } arrays.
 *
 * @param {Array} notes
 * @param {Array} projects
 * @param {{ velocityLimit?: number, stalenessLimit?: number }} options
 */
export function useSignals(notes = [], projects = [], { velocityLimit = 5, stalenessLimit = 5 } = {}) {
    const velocity = useMemo(() => calculateVelocity(notes).slice(0, velocityLimit), [notes, velocityLimit]);
    const staleness = useMemo(() => detectStaleness(projects, notes).slice(0, stalenessLimit), [projects, notes, stalenessLimit]);

    return { velocity, staleness };
}

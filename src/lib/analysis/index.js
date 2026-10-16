/**
 * Signal Extraction Engine
 * Deterministic analysis of raw cognition.
 */

import { noteTags } from "../noteTags.js";
import { extractLinkTargets } from "../parseContentMeta.js";
import { createLinkResolver } from "../linkResolver.js";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const ONE_DAY_MS = 86400000;

function getDaysAgo(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    return diff / ONE_DAY_MS;
}

/* -------------------------------------------------------------------------- */
/*                                 Velocity                                   */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the "Acceleration" of tags.
 * Compares frequency in the last `windowDays` vs. the period before that.
 * 
 * @param {Array} notes 
 * @param {number} windowDays - Default 7 days
 * @returns {Array} Sorted array of { tag, velocity, recentCount, prevCount }
 */
export function calculateVelocity(notes, windowDays = 7) {
    const recentCounts = {};
    const prevCounts = {};
    const allTags = new Set();

    notes.forEach(note => {
        if (!note.createdAt) return;
        const daysAgo = getDaysAgo(note.createdAt);
        const tags = noteTags(note);

        if (daysAgo <= windowDays) {
            // Recent Bucket
            tags.forEach(t => {
                const tag = t.toLowerCase();
                recentCounts[tag] = (recentCounts[tag] || 0) + 1;
                allTags.add(tag);
            });
        } else if (daysAgo <= windowDays * 2) {
            // Previous Bucket
            tags.forEach(t => {
                const tag = t.toLowerCase();
                prevCounts[tag] = (prevCounts[tag] || 0) + 1;
                allTags.add(tag);
            });
        }
    });

    const results = [];
    allTags.forEach(tag => {
        const recent = recentCounts[tag] || 0;
        const prev = prevCounts[tag] || 0;
        const velocity = recent - prev;

        // Only include interesting signals (change happened or significant activity)
        if (recent > 0 || prev > 0) {
            results.push({ tag, velocity, recent, prev });
        }
    });

    // Sort by highest velocity (trending up), then by recent volume
    return results.sort((a, b) => b.velocity - a.velocity || b.recent - a.recent);
}

/* -------------------------------------------------------------------------- */
/*                                 Staleness                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                Clustering                                  */
/* -------------------------------------------------------------------------- */

/**
 * Finds "Connected Components" of notes based on internal links.
 * Notes that link to each other form a cluster.
 * 
 * @param {Array} notes 
 * @returns {Array} Array of Clusters. Each Cluster is { id, notes: [note objects], size }
 */
export function findClusters(notes) {
    // 1. Build Adjacency List (Graph)
    // ID -> Set of Neighbor IDs
    const graph = new Map();
    const noteMap = new Map();
    const resolve = createLinkResolver(notes);

    // Initialize
    notes.forEach(n => {
        graph.set(n.id, new Set());
        noteMap.set(n.id, n);
    });

    // Build Edges
    notes.forEach(source => {
        extractLinkTargets(source.content).forEach(target => {
            const targetId = resolve(target, source)?.id;
            if (targetId && targetId !== source.id) {
                // Bi-directional for clustering context
                graph.get(source.id).add(targetId);
                graph.get(targetId).add(source.id);
            }
        });
    });

    // 2. Find Connected Components (DFS/BFS)
    const visited = new Set();
    const clusters = [];

    notes.forEach(note => {
        if (visited.has(note.id)) return;

        const component = [];
        const stack = [note.id];
        visited.add(note.id);

        while (stack.length > 0) {
            const currId = stack.pop();
            component.push(noteMap.get(currId));

            const neighbors = graph.get(currId) || [];
            neighbors.forEach(neighborId => {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    stack.push(neighborId);
                }
            });
        }

        // Filter trivial clusters (single notes with no connections)
        if (component.length > 1) {
            clusters.push({
                id: component[0].id, // representative ID
                notes: component,
                size: component.length,
                // Heuristic name: Title of node with most connections
                name: findCentralNodeTitle(component, graph)
            });
        }
    });

    return clusters.sort((a, b) => b.size - a.size);
}

function findCentralNodeTitle(component, graph) {
    let maxEdges = -1;
    let bestTitle = "Cluster";

    component.forEach(n => {
        const edges = graph.get(n.id).size;
        if (edges > maxEdges) {
            maxEdges = edges;
            bestTitle = n.title;
        }
    });
    return bestTitle;
}

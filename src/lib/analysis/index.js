/**
 * Signal Extraction Engine
 * Deterministic analysis of raw cognition.
 */

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const ONE_DAY_MS = 86400000;

function getDaysAgo(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    return diff / ONE_DAY_MS;
}

// Extract internal links [[Title]] from content
function extractLinks(content) {
    const matches = (content || "").match(/\[\[(.*?)\]\]/g) || [];
    return matches.map(m => m.slice(2, -2).trim().toLowerCase());
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
        const tags = note.tags || [];

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

/**
 * Identifies projects that haven't been touched in `thresholdDays`.
 * A project is "touched" if a note linked to it was created/updated recently.
 * 
 * @param {Array} projects 
 * @param {Array} notes 
 * @param {number} thresholdDays - Default 14
 * @returns {Array} List of { project, lastActivityDays, status: 'stale'|'active' }
 */
export function detectStaleness(projects, notes, thresholdDays = 14) {
    return projects
        .filter(p => p.status === 'Active') // Only analytics for active projects
        .map(project => {
            // Find all notes linked to this project
            const linkedNotes = notes.filter(n => {
                const ids = n.projectIds || [];
                // Check ID match
                if (ids.includes(project.id)) return true;
                // Check Legacy String match
                if (n.project && project.name && n.project.toLowerCase() === project.name.toLowerCase()) return true;
                return false;
            });

            // Find most recent note date OR use project creation date
            let lastDate = new Date(project.createdAt).getTime();

            linkedNotes.forEach(n => {
                const t = new Date(n.createdAt).getTime();
                if (t > lastDate) lastDate = t;
            });

            const daysAgo = (Date.now() - lastDate) / ONE_DAY_MS;

            return {
                project,
                lastActivityDays: Math.floor(daysAgo),
                isStale: daysAgo > thresholdDays
            };
        })
        .filter(r => r.isStale) // Only return the stale ones? Or all? Let's return all sorted by staleness.
        .sort((a, b) => b.lastActivityDays - a.lastActivityDays);
}

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
    const titleToId = new Map();

    // Initialize
    notes.forEach(n => {
        graph.set(n.id, new Set());
        noteMap.set(n.id, n);
        if (n.title) titleToId.set(n.title.toLowerCase(), n.id);
    });

    // Build Edges
    notes.forEach(source => {
        const links = extractLinks(source.content);
        links.forEach(targetTitle => {
            const targetId = titleToId.get(targetTitle);
            if (targetId) {
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

/* -------------------------------------------------------------------------- */
/*                                Missing Links                               */
/* -------------------------------------------------------------------------- */

/**
 * Identifies pairs of notes that should be linked but aren't.
 * Uses Jaccard Similarity of tags and Title Keyword overlap.
 *
 * @param {Array} notes
 * @returns {Array} Top 5 { noteA, noteB, score, reason }
 */
export function findMissingLinks(notes) {
    const pairs = [];
    // eslint-disable-next-line no-unused-vars
    const noteMap = new Map(notes.map(n => [n.id, n]));
    const linksMap = new Map(); // id -> Set of linked note titles (normalized)

    // Precompute links for fast lookup
    notes.forEach(n => {
        const links = new Set(extractLinks(n.content));
        linksMap.set(n.id, links);
    });

    for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
            const a = notes[i];
            const b = notes[j];

            // Skip if already linked (check both directions)
            const aTitle = (a.title || "").toLowerCase();
            const bTitle = (b.title || "").toLowerCase();
            if (linksMap.get(a.id).has(bTitle) || linksMap.get(b.id).has(aTitle)) {
                continue;
            }

            let score = 0;
            const reasons = [];

            // 1. Tag Overlap (Jaccard)
            const tagsA = new Set((a.tags || []).map(t => t.toLowerCase()));
            const tagsB = new Set((b.tags || []).map(t => t.toLowerCase()));
            const intersection = new Set([...tagsA].filter(x => tagsB.has(x)));
            const union = new Set([...tagsA, ...tagsB]);

            if (union.size > 0) {
                const jaccard = intersection.size / union.size;
                if (jaccard > 0) {
                    score += jaccard * 2; // Weight tags heavily
                    reasons.push(`Shared tags: ${Array.from(intersection).map(t => '#' + t).join(', ')}`);
                }
            }

            // 2. Title Keyword Overlap (Simple)
            // Stopwords could be improved
            const getKeywords = (str) => str.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const kwA = new Set(getKeywords(a.title || ""));
            const kwB = new Set(getKeywords(b.title || ""));
            const kwInt = new Set([...kwA].filter(x => kwB.has(x)));

            if (kwInt.size > 0) {
                score += 1.5;
                reasons.push(`Similar topic: "${Array.from(kwInt).join(', ')}"`);
            }

            if (score > 0.5) {
                pairs.push({
                    noteA: a,
                    noteB: b,
                    score,
                    reason: reasons.join(". ")
                });
            }
        }
    }

    return pairs.sort((a, b) => b.score - a.score).slice(0, 5);
}

/* -------------------------------------------------------------------------- */
/*                               Theme Extraction                             */
/* -------------------------------------------------------------------------- */

/**
 * Generates Themes based on clusters.
 *
 * @param {Array} notes
 * @returns {Array} Top 3 { title, summary, quotes, notes }
 */
export function analyzeThemes(notes) {
    const clusters = findClusters(notes);

    return clusters.slice(0, 3).map(cluster => {
        // Gather Top Tags in Cluster
        const tagCounts = {};
        cluster.notes.forEach(n => {
            (n.tags || []).forEach(t => {
                const tag = t.toLowerCase();
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([t]) => `#${t}`);

        // Gather Quotes (Lines starting with >)
        const quotes = [];
        cluster.notes.forEach(n => {
            const lines = (n.content || "").split('\n');
            lines.forEach(line => {
                if (line.trim().startsWith('>')) {
                    // Clean up callout syntax if present (> [!info])
                    let clean = line.replace(/^>\s*/, '').replace(/^\[!.*?\]\s*/, '');
                    if (clean.length > 20) quotes.push(clean);
                }
            });
        });

        // Summary Construction
        const summary = `A cluster of ${cluster.size} notes revolving around ${topTags.join(', ')} and related concepts.`;

        return {
            title: `Theme: ${cluster.name}`,
            summary,
            quotes: quotes.slice(0, 3), // Top 3 quotes
            notes: cluster.notes
        };
    });
}

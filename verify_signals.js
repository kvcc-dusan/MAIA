
// Mock data and runner for Signal Engine

import { calculateVelocity, detectStaleness, findClusters } from "./src/lib/analysis/index.js";

const now = new Date();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const tenDaysAgo = new Date(Date.now() - 86400000 * 10).toISOString();
const twentyDaysAgo = new Date(Date.now() - 86400000 * 20).toISOString();

const mockNotes = [
    { id: "1", title: "Note A", tags: ["growth"], createdAt: yesterday, content: "Links to [[Note B]]" },
    { id: "2", title: "Note B", tags: ["growth", "urgent"], createdAt: yesterday, content: "Back to [[Note A]]" },
    { id: "3", title: "Note C", tags: ["growth"], createdAt: tenDaysAgo, content: "Isolated" },
    { id: "4", title: "Legacy Note", tags: ["legacy"], createdAt: twentyDaysAgo, content: "Old stuff", project: "Old Project" },
    { id: "5", title: "Stale Project Note", createdAt: twentyDaysAgo, projectIds: ["p1"] },
];

const mockProjects = [
    { id: "p1", name: "Stale Project", status: "Active", createdAt: twentyDaysAgo },
    { id: "p2", name: "New Project", status: "Active", createdAt: yesterday },
];

console.log("--- Velocity ---");
console.log(calculateVelocity(mockNotes));

console.log("\n--- Staleness ---");
console.log(detectStaleness(mockProjects, mockNotes));

console.log("\n--- Clusters ---");
const clusters = findClusters(mockNotes);
console.log(clusters.map(c => ({ name: c.name, size: c.size, ids: c.notes.map(n => n.id) })));

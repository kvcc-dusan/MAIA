import { uid, isoNow } from "../lib/ids";

const SAMPLE_PROJECTS = [
    { name: "Maia Core", status: "Active" },
    { name: "Project Solaris", status: "High Tempo" },
    { name: "Personal Growth", status: "Active" },
    { name: "Archive 2023", status: "Dormant" },
];

const NOTE_TITLES = [
    "Meeting Notes: Q3 Roadmap",
    "Design System Specs",
    "React Performance Optimization",
    "Weekly Review: Feb 09",
    "Idea: Infinite Canvas",
    "Book Notes: Atomic Habits",
    "Recipe: Sourdough Bread",
    "Glossary of Terms",
    "Deployment Checklist",
    "User Interview: Sarah",
    "User Interview: Mike",
    "Bug Report: Login Flicker",
    "Architecture Diagram Draft",
    "Journal: Feeling overwhelmed",
    "Journal: great breakthrough",
    "Shopping List",
    "Gym Workflow",
    "Learning Rust",
    "Gradient Ideas",
    "UI Inspiration Collection",
    "Travel Plans: Japan",
    "Movie Watchlist",
    "Gift Ideas for Mom",
    "Quarterly Goals",
    "Brainstorming: Logo Design",
    "Meeting with Investors",
    "Code Snippets: CSS Grid",
    "Database Schema v2",
    "Performance Audit Results",
    "Refactoring Strategy",
];

const CONTENT_SNIPPETS = [
    "Start with the user needs. We observed that...",
    "Key takeaways:\n- Performance is critical\n- UI needs polish\n- Accessibility first",
    "TODO:\n- [ ] Fix bug\n- [ ] Deploy to prod",
    "Reference link: https://example.com/docs",
    "Use a **bold** strategy for the new layout.",
    "> This is a blockquote about the importance of design.",
    "# Heading 1\n## Heading 2\nSome text here.",
    "Just a quick thought about `useEffect` dependency arrays.",
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[randomInt(0, arr.length - 1)];
}

export function generateDummyData() {
    // 1. Generate Projects
    const projects = SAMPLE_PROJECTS.map(p => ({
        id: uid(),
        name: p.name,
        emoji: "📁",
        status: p.status,
        createdAt: isoNow(),
        description: "Generated project.",
        objective: "",
        successCriteria: [],
        pinnedNoteIds: [],
        links: [],
        milestones: [],
    }));

    // 2. Generate Notes (100 notes)
    const notes = Array.from({ length: 100 }).map((_, i) => {
        const titleRoot = NOTE_TITLES[i % NOTE_TITLES.length];
        const title = `${titleRoot} ${i + 1}`;

        // 30% chance of being in a project
        const project = Math.random() < 0.3 ? randomItem(projects) : null;

        // Generate some random content with Backlinks
        let content = `# ${title}\n\n`;
        const numSnippets = randomInt(2, 5);
        for (let j = 0; j < numSnippets; j++) {
            content += randomItem(CONTENT_SNIPPETS) + "\n\n";
        }

        // Add backlink to another random note (if not self)
        if (Math.random() < 0.4) {
            const otherTitle = randomItem(NOTE_TITLES);
            if (otherTitle !== titleRoot) {
                content += `See also: [[${otherTitle}]]\n`;
            }
        }

        // Pin some notes
        // const isPinned = Math.random() < 0.1; 

        return {
            id: uid(),
            title,
            content,
            tags: [],
            links: [], // would be parsed from content normally
            createdAt: new Date(Date.now() - randomInt(0, 1000 * 60 * 60 * 24 * 90)).toISOString(), // Last 90 days
            project: project ? project.name : null,
            projectIds: project ? [project.id] : [],
        };
    });

    return { projects, notes };
}

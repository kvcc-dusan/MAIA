// @maia:review
import React, { useState, useMemo } from "react";
import { calculateVelocity, detectStaleness, findMissingLinks, analyzeThemes } from "../lib/analysis/index.js";
import { uid, isoNow } from "../lib/ids.js";
import { useData } from "../context/DataContext.jsx";

function SignalCard({ title, children, accent = "zinc" }) {
    const border = {
        zinc: "border-white/5",
        red: "border-red-500/20 bg-red-500/5",
        emerald: "border-emerald-500/20 bg-emerald-500/5",
        amber: "border-amber-500/20 bg-amber-500/5",
        blue: "border-blue-500/20 bg-blue-500/5",
        purple: "border-purple-500/20 bg-purple-500/5"
    }[accent] || "border-white/5";

    return (
        <div className={`p-4 rounded-xl glass-panel ${border} mb-4 shadow-none hover:bg-white/5 transition-colors`}>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">{title}</h3>
            {children}
        </div>
    );
}

export default function ReviewPage({ notes, projects, journal, setJournal, pushToast }) {
    const { createNote, updateNote } = useData();
    const [synthesis, setSynthesis] = useState("");
    const [auditResults, setAuditResults] = useState(null);

    // --- SIGNALS ---
    const signals = useMemo(() => {
        const velocity = calculateVelocity(notes).slice(0, 5); // Top 5 trending
        const staleness = detectStaleness(projects, notes).slice(0, 5); // Top 5 stale
        return { velocity, staleness };
    }, [notes, projects]);

    // --- AUDIT ACTIONS ---
    const handleRunAudit = () => {
        const themes = analyzeThemes(notes);
        const missingLinks = findMissingLinks(notes);
        setAuditResults({ themes, missingLinks });
        pushToast?.("Deep Audit Complete");
    };

    const handleCreateThemeNote = (theme) => {
        // Create note
        const noteId = createNote();

        // Build links list
        const linksSection = theme.notes.map(n => `- [[${n.title}]]`).join("\n");
        const quotesSection = theme.quotes.map(q => `> ${q}`).join("\n\n");

        const content = `# ${theme.title}\n\n**Summary**\n${theme.summary}\n\n## Key Insights\n${quotesSection}\n\n## Related Notes\n${linksSection}`;

        updateNote({
            id: noteId,
            title: theme.title,
            content: content,
            tags: ["permanent-note", "theme"]
        });
        pushToast?.("Permanent Note Created");
    };

    const handleConnectNotes = (linkPair) => {
        const { noteA, noteB } = linkPair;

        // Append link to A
        updateNote({
            id: noteA.id,
            content: (noteA.content || "") + `\n\n[[${noteB.title}]]`
        });

        // Append link to B
        updateNote({
            id: noteB.id,
            content: (noteB.content || "") + `\n\n[[${noteA.title}]]`
        });

        // Remove from list locally to avoid double clicking
        setAuditResults(prev => ({
            ...prev,
            missingLinks: prev.missingLinks.filter(p => p !== linkPair)
        }));

        pushToast?.("Notes Connected");
    };

    const handleCommit = () => {
        if (!synthesis.trim()) return;

        const entry = {
            id: uid(),
            content: `#synthesis\n\n${synthesis}`,
            createdAt: isoNow(),
            tags: ["synthesis"],
            type: "synthesis" // optional discriminator
        };

        setJournal([entry, ...journal]);
        setSynthesis("");
        pushToast?.("Synthesis Recorded");
    };

    return (
        <div className="h-full flex flex-col md:flex-row w-full relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10" />
            </div>

            {/* LEFT: The Signal (Read-Only) */}
            <div className="w-full md:w-80 flex-none border-r border-white/5 bg-black/60 backdrop-blur-xl overflow-y-auto relative z-10 custom-scrollbar">
                <header className="p-6 border-b border-white/5 flex-none">
                    <h1 className="text-xl font-mono text-white font-bold tracking-tight">Review</h1>
                </header>

                <div className="p-6 space-y-4">

                    {/* MOMENTUM */}
                    <SignalCard title="Momentum (7 Days)" accent="emerald">
                        {signals.velocity.length === 0 ? (
                            <div className="text-zinc-600 italic text-sm">No significant movement.</div>
                        ) : (
                            <div className="space-y-2">
                                {signals.velocity.map(v => (
                                    <div key={v.tag} className="flex items-center justify-between">
                                        <span className="text-zinc-300 text-sm">#{v.tag}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-400 text-xs font-mono">+{v.velocity}</span>
                                            <span className="text-zinc-600 text-[10px]">({v.recent})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SignalCard>

                    {/* STAGNATION */}
                    <SignalCard title="At Risk (Stale Loops)" accent="red">
                        {signals.staleness.length === 0 ? (
                            <div className="text-zinc-600 italic text-sm">All loops active.</div>
                        ) : (
                            <div className="space-y-2">
                                {signals.staleness.map(s => (
                                    <div key={s.project.id} className="flex flex-col">
                                        <div className="text-zinc-300 text-sm truncate">{s.project.name}</div>
                                        <div className="text-red-400/80 text-[10px] font-mono">
                                            Untouched for {s.lastActivityDays} days
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SignalCard>

                    {/* AUDIT TRIGGER */}
                     <SignalCard title="Deep Knowledge Audit" accent="purple">
                        <div className="text-zinc-500 text-xs mb-3 leading-relaxed">
                            Analyze themes and bridge gaps in your knowledge graph.
                        </div>
                        <button
                            onClick={handleRunAudit}
                            className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold rounded-lg border border-purple-500/20 transition-colors"
                        >
                            Run Deep Audit
                        </button>
                    </SignalCard>

                    {/* CONTEXT */}
                    <div className="mt-8 text-xs text-zinc-600 leading-relaxed border-t border-white/5 pt-4">
                        <p>These signals are deterministic. They reflect the shape of your attention, not your intentions.</p>
                    </div>
                </div>
            </div>

            {/* RIGHT: Synthesis OR Audit Report */}
            <div className="flex-1 min-w-0 flex flex-col relative z-10 overflow-y-auto">
                {auditResults ? (
                    <div className="p-8 md:p-12 max-w-4xl mx-auto w-full space-y-12">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-light text-white tracking-tight">Audit Report</h2>
                            <button
                                onClick={() => setAuditResults(null)}
                                className="text-zinc-500 hover:text-white text-sm"
                            >
                                Close Report
                            </button>
                        </div>

                        {/* Themes */}
                        <section>
                            <h3 className="text-xl text-purple-400 font-mono mb-6">Emergent Themes</h3>
                            <div className="grid gap-6">
                                {auditResults.themes.map((theme, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <h4 className="text-lg font-bold text-white">{theme.title}</h4>
                                            <button
                                                onClick={() => handleCreateThemeNote(theme)}
                                                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-zinc-300 transition-colors"
                                            >
                                                Create Permanent Note
                                            </button>
                                        </div>
                                        <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{theme.summary}</p>

                                        {theme.quotes.length > 0 && (
                                            <div className="space-y-2 bg-black/40 p-4 rounded-lg">
                                                {theme.quotes.map((q, j) => (
                                                    <div key={j} className="text-zinc-500 italic text-xs border-l-2 border-purple-500/30 pl-3">
                                                        "{q}"
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {auditResults.themes.length === 0 && (
                                    <div className="text-zinc-600 italic">No strong clusters found yet. Write more linked notes.</div>
                                )}
                            </div>
                        </section>

                        {/* Missing Links */}
                        <section>
                            <h3 className="text-xl text-blue-400 font-mono mb-6">Missing Links</h3>
                            <div className="grid gap-4">
                                {auditResults.missingLinks.map((pair, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg p-4 hover:border-blue-500/20 transition-colors">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-zinc-200 font-bold truncate">{pair.noteA.title}</span>
                                                <span className="text-zinc-600">↔</span>
                                                <span className="text-zinc-200 font-bold truncate">{pair.noteB.title}</span>
                                            </div>
                                            <div className="text-blue-400/60 text-xs font-mono">{pair.reason}</div>
                                        </div>
                                        <button
                                            onClick={() => handleConnectNotes(pair)}
                                            className="shrink-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded text-sm font-medium transition-colors"
                                        >
                                            Bridge
                                        </button>
                                    </div>
                                ))}
                                {auditResults.missingLinks.length === 0 && (
                                    <div className="text-zinc-600 italic">No obvious gaps found. Good connectivity.</div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="h-full flex flex-col p-8 md:p-12">
                        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
                            <h2 className="text-3xl font-light text-white mb-2 tracking-tight">Strategic Synthesis</h2>
                            <p className="text-zinc-500 text-sm mb-8 font-mono">
                                Confront the signals. What is the necessary adjustment?
                            </p>

                            <div className="relative group">
                                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-white/5 to-transparent blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                                <textarea
                                    className="relative w-full bg-black/60 border border-white/10 rounded-xl p-6 text-zinc-200 text-lg leading-relaxed outline-none focus:border-white/20 focus:bg-black/80 transition-all resize-none placeholder:text-zinc-700 font-sans min-h-[300px] shadow-2xl"
                                    placeholder="Observation: My attention is drifting toward...&#10;Adjustment: I will pause Project X to focus on..."
                                    value={synthesis}
                                    onChange={e => setSynthesis(e.target.value)}
                                />
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleCommit}
                                    disabled={!synthesis.trim()}
                                    className="bg-zinc-100 hover:bg-white text-black px-8 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5"
                                >
                                    Commit to Journal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// @maia:review
import React, { useState, useMemo } from "react";
import { calculateVelocity, detectStaleness } from "../lib/analysis/index.js";
import { uid, isoNow } from "../lib/ids.js";

function SignalCard({ title, children, accent = "zinc" }) {
    const border = {
        zinc: "border-white/5",
        red: "border-red-500/20 bg-red-500/5",
        emerald: "border-emerald-500/20 bg-emerald-500/5",
        amber: "border-amber-500/20 bg-amber-500/5"
    }[accent] || "border-white/5";

    return (
        <div className={`p-4 rounded-xl glass-panel ${border} mb-4 shadow-none hover:bg-white/5 transition-colors`}>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">{title}</h3>
            {children}
        </div>
    );
}

export default function ReviewPage({ notes, projects, journal, setJournal, pushToast }) {
    const [synthesis, setSynthesis] = useState("");

    // --- SIGNALS ---
    const signals = useMemo(() => {
        const velocity = calculateVelocity(notes).slice(0, 5); // Top 5 trending
        const staleness = detectStaleness(projects, notes).slice(0, 5); // Top 5 stale

        // Simple "Ledger" signal (mocked or simple count)
        // In real app, we'd pass ledger prop and count items in last 7 days

        return { velocity, staleness };
    }, [notes, projects]);

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
            {/* Background: Dithered waves (Global) */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10" />
                {/* We can rely on the App wrapper for background, or add the Dither component if we want it explicit. 
                    For now, transparency allows the global background to show through. 
                */}
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

                    {/* CONTEXT */}
                    <div className="mt-8 text-xs text-zinc-600 leading-relaxed border-t border-white/5 pt-4">
                        <p>These signals are deterministic. They reflect the shape of your attention, not your intentions.</p>
                    </div>
                </div>
            </div>

            {/* RIGHT: The Synthesis (Write-Only) */}
            <div className="flex-1 min-w-0 flex flex-col p-8 md:p-12 lg:px-16 relative z-10">
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
        </div>
    );
}

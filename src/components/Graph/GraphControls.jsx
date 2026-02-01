// @maia:graph-controls
import React from "react";
import { GlassCard, GlassInput } from "../GlassCard";
import ProjectIcon from "../ProjectIcon";
import { dottedBg } from "../../lib/theme.js";

const COLORS = [
    "#2dd4bf", // Teal (Growth)
    "#f472b6", // Pink (Creative)
    "#fbbf24", // Amber (Energy)
    "#818cf8", // Indigo (Deep)
    "#34d399", // Emerald
    "#a78bfa", // Violet
];

export default function GraphControls({
    isPanelOpen,
    setIsPanelOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleZoomToNode,
    showOnlyProjects,
    setShowOnlyProjects,
    showOrphans,
    setShowOrphans,
    showGhostNodes,
    setShowGhostNodes,
    showSignals,
    setShowSignals,
    nodeSize,
    setNodeSize,
    linkThickness,
    setLinkThickness,
    fontSize,
    setFontSize,
    repelForce,
    setRepelForce,
    linkDistance,
    setLinkDistance,
    hotTags,
    activeCluster,
    setActiveCluster,
    clusters
}) {
    return (
        <>
            {/* Panel Toggle Button */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="absolute top-4 right-4 z-50 p-2 text-zinc-400 hover:text-white bg-black/50 backdrop-blur rounded-lg border border-white/10 transition-colors"
            >
                <ProjectIcon name="settings" size={20} />
            </button>

            {/* Panel Drawer */}
            <div className={`absolute top-0 right-0 h-full w-80 z-40 transition-transform duration-300 ease-in-out ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <GlassCard className="h-full w-full border-l border-white/10 bg-black/80 backdrop-blur-2xl flex flex-col rounded-none">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <ProjectIcon name="sliders" size={16} className="text-zinc-500" />
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Graph Controls</h2>
                        </div>
                        <button
                            onClick={() => setIsPanelOpen(false)}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            <ProjectIcon name="check" size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">

                        {/* SEARCH */}
                        <div className="space-y-2">
                            <div className="relative">
                                <ProjectIcon name="search" size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                                <GlassInput
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 py-1.5 text-xs w-full bg-white/5 focus:bg-white/10"
                                />
                            </div>
                            {/* Quick Results */}
                            {searchResults.length > 0 && (
                                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto noscroll">
                                    {searchResults.map(res => (
                                        <button key={res.id} onClick={() => handleZoomToNode(res.id)}
                                            className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 text-left group">
                                            <div className="w-1.5 h-1.5 rounded-full ring-1 ring-white/20 group-hover:ring-white/50" style={{ background: res.color }} />
                                            <span className="text-xs text-zinc-300 truncate">{res.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FILTERS */}
                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                <ProjectIcon name="filter" size={12} /> Filters
                            </h3>

                            <div className="space-y-3 pl-1">
                                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer group">
                                    <span className="group-hover:text-white transition-colors">Show Only Projects</span>
                                    <input type="checkbox" checked={showOnlyProjects} onChange={e => setShowOnlyProjects(e.target.checked)} className="accent-blue-500" />
                                </label>
                                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer group">
                                    <span className="group-hover:text-white transition-colors">Show Orphans</span>
                                    <input type="checkbox" checked={showOrphans} onChange={e => setShowOrphans(e.target.checked)} className="accent-blue-500" />
                                </label>
                                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer group">
                                    <span className="group-hover:text-white transition-colors">Ghost Nodes (Missing)</span>
                                    <input type="checkbox" checked={showGhostNodes} onChange={e => setShowGhostNodes(e.target.checked)} className="accent-blue-500" />
                                </label>
                                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer group">
                                    <span className="group-hover:text-white transition-colors">Analysis Signals</span>
                                    <input type="checkbox" checked={showSignals} onChange={e => setShowSignals(e.target.checked)} className="accent-blue-500" />
                                </label>
                            </div>
                        </div>

                        {/* DISPLAY */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                <ProjectIcon name="palette" size={12} /> Display
                            </h3>

                            <div className="space-y-3 pl-1">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span>Node Size</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5" max="2" step="0.1"
                                        value={nodeSize}
                                        onChange={e => setNodeSize(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span>Link Thickness</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5" max="5" step="0.5"
                                        value={linkThickness}
                                        onChange={e => setLinkThickness(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span>Text Size</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5" max="2" step="0.1"
                                        value={fontSize}
                                        onChange={e => setFontSize(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PHYSICS */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                <ProjectIcon name="activity" size={12} /> Physics
                            </h3>

                            <div className="space-y-3 pl-1">
                                {/* Entropy (Repel) */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span>Entropy</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10" max="800" step="10"
                                        value={repelForce}
                                        onChange={e => setRepelForce(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Entanglement (Link Distance) */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span>Entanglement</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10" max="500" step="10"
                                        value={linkDistance}
                                        onChange={e => setLinkDistance(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* MOMENTUM (Restored) */}
                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <ProjectIcon name="zap" size={12} className="text-zinc-500" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Momentum</h3>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(hotTags).slice(0, 10).map(tag => (
                                    <span key={tag} className="text-[10px] bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors cursor-default">
                                        #{tag}
                                    </span>
                                ))}
                                {hotTags.size === 0 && (
                                    <span className="text-xs text-zinc-600 italic">No trending tags</span>
                                )}
                            </div>
                        </div>

                        {/* GROUPS (Analysis) */}
                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                                <ProjectIcon name="layers" size={12} /> Groups
                            </h3>
                            <div className="space-y-1">
                                {clusters.slice(0, 5).map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                                        className={`w-full text-left text-xs px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${activeCluster === i
                                            ? "bg-white/10 text-white"
                                            : "text-zinc-400 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="truncate max-w-[120px]">{c.name}</span>
                                        </div>
                                        <span className="text-zinc-600 font-mono">{c.size}</span>
                                    </button>
                                ))}
                            </div>
                        </div>


                    </div>
                </GlassCard>
            </div>
        </>
    );
}

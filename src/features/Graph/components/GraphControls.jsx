// @maia:graph-controls
import React from "react";
import { GlassCard, GlassInput } from "../../../components/GlassCard";
import ProjectIcon from "../../../components/ProjectIcon";

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
            {/* Panel Toggle Button - Positioned top right, distinct */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-300 ${isPanelOpen
                    ? "bg-white text-black border-white"
                    : "bg-black/50 text-zinc-400 border-white/10 hover:text-white hover:border-white/20 backdrop-blur-md"
                    }`}
                aria-label="Toggle Graph Controls"
            >
                <ProjectIcon name={isPanelOpen ? "x" : "settings"} size={20} />
            </button>

            {/* Click-away backdrop (closes panel when clicking outside) */}
            {isPanelOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsPanelOpen(false)}
                />
            )}

            {/* Panel Drawer - Floating Right Sidebar (Below Toggle) */}
            <div
                className={`absolute top-20 right-6 bottom-6 w-80 z-40 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform flex flex-col font-mono shadow-2xl ${isPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">ConneXa</span>
                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-600">Controls</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* SEARCH */}
                    <div className="space-y-3">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Search</div>
                        <div className="relative">
                            <ProjectIcon name="search" size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                            <GlassInput
                                placeholder="Find node..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 py-2 text-xs w-full bg-white/5 border-white/10 focus:bg-white/10 focus:border-white/20 rounded-lg text-zinc-300 placeholder:text-zinc-600"
                            />
                        </div>
                        {/* Quick Results */}
                        {searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pt-2">
                                {searchResults.map(res => (
                                    <button key={res.id} onClick={() => handleZoomToNode(res.id)}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left group transition-colors">
                                        <div className="w-2 h-2 rounded-full ring-1 ring-white/20 group-hover:ring-white/50 transition-all" style={{ background: res.color }} />
                                        <span className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate font-mono">{res.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FILTERS */}
                    <div className="space-y-3">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Filters</div>

                        <div className="space-y-1">
                            <label className="flex items-center justify-between py-2 text-xs text-zinc-400 cursor-pointer group hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-zinc-200 transition-colors">Show Only Projects</span>
                                <input type="checkbox" checked={showOnlyProjects} onChange={e => setShowOnlyProjects(e.target.checked)} className="accent-white" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-zinc-400 cursor-pointer group hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-zinc-200 transition-colors">Show Orphans</span>
                                <input type="checkbox" checked={showOrphans} onChange={e => setShowOrphans(e.target.checked)} className="accent-white" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-zinc-400 cursor-pointer group hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-zinc-200 transition-colors">Ghost Nodes</span>
                                <input type="checkbox" checked={showGhostNodes} onChange={e => setShowGhostNodes(e.target.checked)} className="accent-white" />
                            </label>
                        </div>
                    </div>

                    {/* DISPLAY */}
                    <div className="space-y-4">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Display</div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>Node Size</span>
                                    <span>{nodeSize}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="2" step="0.1"
                                    value={nodeSize}
                                    onChange={e => setNodeSize(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>Link Thickness</span>
                                    <span>{linkThickness}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="5" step="0.5"
                                    value={linkThickness}
                                    onChange={e => setLinkThickness(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>Text Size</span>
                                    <span>{fontSize}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="2" step="0.1"
                                    value={fontSize}
                                    onChange={e => setFontSize(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PHYSICS */}
                    <div className="space-y-4">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Physics</div>

                        <div className="space-y-4">
                            {/* Entropy (Repel) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>Entropy</span>
                                    <span>{repelForce}</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="800" step="10"
                                    value={repelForce}
                                    onChange={e => setRepelForce(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
                                />
                            </div>

                            {/* Entanglement (Link Distance) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>Entanglement</span>
                                    <span>{linkDistance}</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="500" step="10"
                                    value={linkDistance}
                                    onChange={e => setLinkDistance(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MOMENTUM */}
                    <div className="space-y-3">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Momentum</div>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(hotTags).slice(0, 10).map(tag => (
                                <span key={tag} className="text-[10px] bg-white/5 border border-white/10 text-zinc-400 px-2.5 py-1 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-default font-mono">
                                    #{tag}
                                </span>
                            ))}
                            {hotTags.size === 0 && (
                                <span className="text-xs text-zinc-700 italic font-mono">No trending tags</span>
                            )}
                        </div>
                    </div>

                    {/* GROUPS (Analysis) */}
                    <div className="space-y-3 pb-8">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Clusters</div>
                        <div className="space-y-1">
                            {clusters.slice(0, 5).map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                                    className={`w-full text-left text-xs px-2 py-2 rounded-lg flex items-center justify-between transition-all ${activeCluster === i
                                        ? "bg-white/10 text-white"
                                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                        <span className="truncate max-w-[120px] font-mono">{c.name}</span>
                                    </div>
                                    <span className="text-zinc-600 font-mono text-[10px]">{c.size}</span>
                                </button>
                            ))}
                        </div>
                    </div>


                </div>
            </div>
        </>
    );
}

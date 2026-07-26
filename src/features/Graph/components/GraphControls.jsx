// @maia:graph-controls
import React from "react";
import { GlassCard, GlassInput } from "../../../components/GlassCard";
import ProjectIcon from "../../../components/ProjectIcon";
import { SettingsIcon, SearchIcon } from "../../../components/ui/CustomIcon.jsx";

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
                    : "bg-black/50 text-muted-foreground border-border hover:text-white hover:border-border-strong backdrop-blur-md"
                    }`}
                aria-label="Toggle Graph Controls"
            >
                {isPanelOpen ? (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    <SettingsIcon size={18} />
                )}
            </button>

            {/* Click-away backdrop (closes panel when clicking outside) */}
            {isPanelOpen && (
                <div
                    className="fixed inset-0 z-drawer"
                    onClick={() => setIsPanelOpen(false)}
                />
            )}

            {/* Panel Drawer - Floating Right Sidebar (Below Toggle) */}
            <div
                className={`absolute top-20 right-4 bottom-6 left-4 sm:left-auto sm:right-6 sm:w-80 z-overlay bg-popover/90 supports-backdrop-filter:backdrop-blur-xl border border-border rounded-2xl transition-all duration-300 ease-maia will-change-transform flex flex-col shadow-2xl ${isPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-5 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Connexa</span>
                        <span className="text-xs bg-overlay-subtle px-1.5 py-0.5 rounded text-subtle-foreground">Controls</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* SEARCH */}
                    <div className="space-y-3">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Search</div>
                        <div className="relative">
                            <SearchIcon size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                            <GlassInput
                                placeholder="Find node..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 py-2 text-xs w-full bg-overlay-subtle border-border focus:bg-overlay focus:border-border-strong rounded-lg text-foreground-secondary placeholder:text-subtle-foreground"
                            />
                        </div>
                        {/* Quick Results */}
                        {searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pt-2">
                                {searchResults.map(res => (
                                    <button key={res.id} onClick={() => handleZoomToNode(res.id)}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-overlay-subtle text-left group transition-colors">
                                        <div className="w-2 h-2 rounded-full ring-1 ring-overlay-strong group-hover:ring-white/50 transition-all" style={{ background: res.color }} />
                                        <span className="text-xs text-muted-foreground group-hover:text-foreground truncate">{res.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FILTERS */}
                    <div className="space-y-3">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Filters</div>

                        <div className="space-y-1">
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Show Only Projects</span>
                                <input type="checkbox" checked={showOnlyProjects} onChange={e => setShowOnlyProjects(e.target.checked)} className="accent-white" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Show Orphans</span>
                                <input type="checkbox" checked={showOrphans} onChange={e => setShowOrphans(e.target.checked)} className="accent-white" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Ghost Nodes</span>
                                <input type="checkbox" checked={showGhostNodes} onChange={e => setShowGhostNodes(e.target.checked)} className="accent-white" />
                            </label>
                        </div>
                    </div>

                    {/* DISPLAY */}
                    <div className="space-y-4">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Display</div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Node Size</span>
                                    <span>{nodeSize}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="2" step="0.1"
                                    value={nodeSize}
                                    onChange={e => setNodeSize(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-overlay rounded-lg appearance-none cursor-pointer accent-white hover:accent-foreground-secondary"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Link Thickness</span>
                                    <span>{linkThickness}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="5" step="0.5"
                                    value={linkThickness}
                                    onChange={e => setLinkThickness(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-overlay rounded-lg appearance-none cursor-pointer accent-white hover:accent-foreground-secondary"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Text Size</span>
                                    <span>{fontSize}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5" max="2" step="0.1"
                                    value={fontSize}
                                    onChange={e => setFontSize(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-overlay rounded-lg appearance-none cursor-pointer accent-white hover:accent-foreground-secondary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PHYSICS */}
                    <div className="space-y-4">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Physics</div>

                        <div className="space-y-4">
                            {/* Entropy (Repel) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Entropy</span>
                                    <span>{repelForce}</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="800" step="10"
                                    value={repelForce}
                                    onChange={e => setRepelForce(parseInt(e.target.value))}
                                    className="w-full h-1 bg-overlay rounded-lg appearance-none cursor-pointer accent-white hover:accent-foreground-secondary"
                                />
                            </div>

                            {/* Entanglement (Link Distance) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Entanglement</span>
                                    <span>{linkDistance}</span>
                                </div>
                                <input
                                    type="range"
                                    min="10" max="500" step="10"
                                    value={linkDistance}
                                    onChange={e => setLinkDistance(parseInt(e.target.value))}
                                    className="w-full h-1 bg-overlay rounded-lg appearance-none cursor-pointer accent-white hover:accent-foreground-secondary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MOMENTUM */}
                    <div className="space-y-3">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Momentum</div>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(hotTags).slice(0, 10).map(tag => (
                                <span key={tag} className="text-xs bg-overlay-subtle border border-border text-muted-foreground px-2.5 py-1 rounded-full hover:bg-overlay hover:text-white transition-colors cursor-default">
                                    #{tag}
                                </span>
                            ))}
                            {hotTags.size === 0 && (
                                <span className="text-xs text-faint-foreground italic">No trending tags</span>
                            )}
                        </div>
                    </div>

                    {/* GROUPS (Analysis) */}
                    <div className="space-y-3 pb-8">
                        <div className="text-xs text-subtle-foreground uppercase tracking-widest font-bold">Clusters</div>
                        <div className="space-y-1">
                            {clusters.slice(0, 5).map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                                    className={`w-full text-left text-xs px-2 py-2 rounded-lg flex items-center justify-between transition-all ${activeCluster === i
                                        ? "bg-overlay text-white"
                                        : "text-muted-foreground hover:bg-overlay-subtle hover:text-foreground-secondary"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                        <span className="truncate max-w-[120px]">{c.name}</span>
                                    </div>
                                    <span className="text-subtle-foreground text-xs">{c.size}</span>
                                </button>
                            ))}
                        </div>
                    </div>


                </div>
            </div>
        </>
    );
}

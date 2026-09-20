// @maia:graph-controls
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SettingsIcon, SearchIcon } from "../../../components/ui/CustomIcon.jsx";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { clusterColors } from "@/lib/tokens";

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
    // Same palette the renderer paints clusters with — resolved per mount
    // rather than at module scope so the stylesheet is guaranteed applied.
    const COLORS = useMemo(() => clusterColors(), []);

    return (
        <>
            {/* Panel Toggle Button - Positioned top right, distinct */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={cn(
                    "absolute top-6 right-6 z-overlay grid size-10 place-items-center rounded-full border transition-colors",
                    isPanelOpen
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-popover/80 text-muted-foreground backdrop-blur-md hover:border-border-strong hover:text-foreground"
                )}
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
                        <SectionLabel as="h2">Connexa</SectionLabel>
                        <CountPill>Controls</CountPill>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* SEARCH */}
                    <div className="space-y-3">
                        <SectionLabel>Search</SectionLabel>
                        <div className="relative">
                            <SearchIcon size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Find node…"
                                aria-label="Find node"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 text-xs"
                            />
                        </div>
                        {/* Quick Results */}
                        {searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pt-2">
                                {searchResults.map(res => (
                                    <button key={res.id} onClick={() => handleZoomToNode(res.id)}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-overlay-subtle text-left group transition-colors">
                                        <div className="w-2 h-2 rounded-full ring-1 ring-overlay-strong group-hover:ring-border-strong transition-all" style={{ background: res.color }} />
                                        <span className="text-xs text-muted-foreground group-hover:text-foreground truncate">{res.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FILTERS */}
                    <div className="space-y-3">
                        <SectionLabel>Filters</SectionLabel>

                        <div className="space-y-1">
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Show Only Projects</span>
                                <Checkbox checked={showOnlyProjects} onCheckedChange={setShowOnlyProjects} aria-label="Show Only Projects" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Show Orphans</span>
                                <Checkbox checked={showOrphans} onCheckedChange={setShowOrphans} aria-label="Show Orphans" />
                            </label>
                            <label className="flex items-center justify-between py-2 text-xs text-muted-foreground cursor-pointer group hover:bg-overlay-subtle px-2 -mx-2 rounded-lg transition-colors">
                                <span className="group-hover:text-foreground transition-colors">Ghost Nodes</span>
                                <Checkbox checked={showGhostNodes} onCheckedChange={setShowGhostNodes} aria-label="Ghost Nodes" />
                            </label>
                        </div>
                    </div>

                    {/* DISPLAY */}
                    <div className="space-y-4">
                        <SectionLabel>Display</SectionLabel>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Node Size</span>
                                    <span>{nodeSize}x</span>
                                </div>
                                <Slider
                                    min={0.5} max={2} step={0.1}
                                    value={nodeSize}
                                    onChange={setNodeSize}
                                    label="Node Size"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Link Thickness</span>
                                    <span>{linkThickness}px</span>
                                </div>
                                <Slider
                                    min={0.5} max={5} step={0.5}
                                    value={linkThickness}
                                    onChange={setLinkThickness}
                                    label="Link Thickness"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Text Size</span>
                                    <span>{fontSize}x</span>
                                </div>
                                <Slider
                                    min={0.5} max={2} step={0.1}
                                    value={fontSize}
                                    onChange={setFontSize}
                                    label="Text Size"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PHYSICS */}
                    <div className="space-y-4">
                        <SectionLabel>Physics</SectionLabel>

                        <div className="space-y-4">
                            {/* Entropy (Repel) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Entropy</span>
                                    <span>{repelForce}</span>
                                </div>
                                <Slider
                                    min={10} max={800} step={10}
                                    value={repelForce}
                                    onChange={setRepelForce}
                                    label="Entropy"
                                />
                            </div>

                            {/* Entanglement (Link Distance) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Entanglement</span>
                                    <span>{linkDistance}</span>
                                </div>
                                <Slider
                                    min={10} max={500} step={10}
                                    value={linkDistance}
                                    onChange={setLinkDistance}
                                    label="Entanglement"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MOMENTUM */}
                    <div className="space-y-3">
                        <SectionLabel>Momentum</SectionLabel>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(hotTags).slice(0, 10).map(tag => (
                                <span key={tag} className="text-xs bg-overlay-subtle border border-border text-muted-foreground px-2.5 py-1 rounded-full hover:bg-overlay hover:text-foreground transition-colors cursor-default">
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
                        <SectionLabel>Clusters</SectionLabel>
                        <div className="space-y-1">
                            {clusters.slice(0, 5).map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                                    className={`w-full text-left text-xs px-2 py-2 rounded-lg flex items-center justify-between transition-all ${activeCluster === i
                                        ? "bg-overlay text-foreground"
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

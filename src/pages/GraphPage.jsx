// @maia:graph
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { dottedBg } from "../lib/theme.js";
import { calculateVelocity, findClusters } from "../lib/analysis/index.js";
import { GlassCard, GlassInput } from "../components/GlassCard";
import ProjectIcon from "../components/ProjectIcon";

/* -----------------------------------------
   Theme Constants
----------------------------------------- */
const COLORS = [
  "#2dd4bf", // Teal (Growth)
  "#f472b6", // Pink (Creative)
  "#fbbf24", // Amber (Energy)
  "#818cf8", // Indigo (Deep)
  "#34d399", // Emerald
  "#a78bfa", // Violet
];

const THEME = {
  bg: "#000000",
  nodeFill: "#e4e4e7", // zinc-200 (Light Gray)
  nodeActive: "#ffffff", // Pure White
  nodeStroke: "none",
  link: "#27272a", // zinc-800
  text: "#a1a1aa", // zinc-400
  textActive: "#f4f4f5", // zinc-100
};

export default function GraphPage({ notes, projects = [], onOpenNote }) {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);
  const zoomRef = useRef(null); // Store zoom behavior
  const gRef = useRef(null); // Store the main group for zooming

  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);
  const [showSignals, setShowSignals] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyProjects, setShowOnlyProjects] = useState(false);

  // Refs for access inside D3 closures without re-running effects
  const searchRef = useRef("");
  const nodesRef = useRef([]); // Track current nodes for zoom

  // Sync refs
  useEffect(() => { searchRef.current = searchQuery; }, [searchQuery]);

  // --- ANALYSIS ---

  const analysis = useMemo(() => {
    // 1. Clusters
    const rawClusters = findClusters(notes);
    const clusterMap = new Map(); // noteId -> clusterIndex
    rawClusters.forEach((c, idx) => {
      c.notes.forEach(n => clusterMap.set(n.id, idx));
    });

    // 2. Velocity (Tags)
    const velocityStats = calculateVelocity(notes);
    const hotTags = new Set(velocityStats.filter(v => v.velocity > 0).map(v => v.tag));

    // Helper to check if note is "Hot"
    const isHot = (n) => (n.tags || []).some(t => hotTags.has(t));

    return { rawClusters, clusterMap, isHot, hotTags };
  }, [notes]);

  // --- GRAPH DATA PREP ---

  const { nodes, links } = useMemo(() => {
    const normalize = (s) => (s || "").trim().toLowerCase();

    // 1. Note Nodes
    let noteNodes = notes.map((n) => {
      const clusterIdx = analysis.clusterMap.get(n.id);
      const clusterColor = clusterIdx !== undefined ? COLORS[clusterIdx % COLORS.length] : THEME.nodeStroke;

      return {
        id: n.id,
        title: n.title || "Untitled",
        type: "note",
        group: clusterIdx,
        color: clusterColor,
        isHot: analysis.isHot(n),
        tags: n.tags || [],
        val: 1 + (n.content?.length || 0) / 1000, // Size by content length
        project: n.project || null,
        projectIds: n.projectIds || [],
      };
    });

    // 2. Project Nodes
    const projectNodes = projects.map(p => ({
      id: `proj-${p.id}`,
      realId: p.id,
      title: p.name,
      type: "project",
      color: "#3b82f6", // Blue (Tailwind 500) - visually distinct blue
      val: 3, // Smaller fixed size (~5% larger)
      tags: ["Project"],
    }));

    // Filter if needed
    if (showOnlyProjects) {
      noteNodes = [];
    }

    const allNodes = [...noteNodes, ...projectNodes];
    const idByTitle = new Map(notes.map((n) => [normalize(n.title), n.id]));
    const d3Links = [];

    // 3. Links
    notes.forEach((n) => {
      if (showOnlyProjects) return; // Skip note links if filtering projects

      const sourceId = n.id;

      // Note -> Note (Mentions)
      const matches = (n.content || "").match(/\[\[(.+?)\]\]/g) || [];
      matches.forEach((m) => {
        const t = m.slice(2, -2).trim();
        const targetId = idByTitle.get(normalize(t));
        if (targetId && targetId !== sourceId) {
          d3Links.push({ source: sourceId, target: targetId });
        }
      });

      // Note -> Project
      projects.forEach(p => {
        const isLinked = (n.projectIds && n.projectIds.includes(p.id)) ||
          (n.project && normalize(n.project) === normalize(p.name));
        if (isLinked) {
          d3Links.push({ source: sourceId, target: `proj-${p.id}` });
        }
      });
    });

    // Project -> Project links? (Not currently in data model, but if they existed, we'd add them here)
    // If showOnlyProjects is true, we might want to verify if projects are connected.
    // Currently projects are connected via notes. If notes are hidden, projects are isolated
    // unless we infer connections. Requirement says: "only show the connection between Projects (if any) or just the project galaxy."
    // For now, we'll just show the nodes if no direct project-project links exist.

    return { nodes: allNodes, links: d3Links };
  }, [notes, projects, analysis, showOnlyProjects]);


  // --- D3 RENDER ---

  useEffect(() => {
    if (!svgRef.current) return;

    // Measurements
    const width = dims.w;
    const height = dims.h;

    // Clean old
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Layers
    const g = svg.append("g");
    gRef.current = g; // Store for zoom

    const linkLayer = g.append("g").attr("class", "links");
    const nodeLayer = g.append("g").attr("class", "nodes");
    const labelLayer = g.append("g").attr("class", "labels");

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(0.2)) // Softer, more elastic feel
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => 15 + d.val).strength(0.8));

    // Update ref for Zoom access
    nodesRef.current = nodes;

    // Elements
    // Use paths for curved 'elastic' links
    const link = linkLayer.selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", THEME.link)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("class", "link-element");

    const node = nodeLayer.selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.type === "project" ? 10 : (6 + Math.sqrt(d.val * 3)))
      .attr("fill", d => d.type === "project" ? d.color : THEME.nodeFill)
      .attr("stroke", "none")
      .attr("stroke-width", 0)
      .style("cursor", "pointer")
      .attr("class", "node-element")
      .call(drag(simulation));

    const label = labelLayer.selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.title)
      .attr("font-size", d => 10 + d.val)
      .attr("fill", THEME.text)
      .attr("text-anchor", "middle") // Center text horizontally
      .attr("dy", d => 28 + d.val) // Position below the node with more gap
      .attr("opacity", 0.7) // Default visible but slightly transparent
      .style("pointer-events", "none")
      .style("transition", "opacity 0.2s")
      .attr("class", "label-element");


    // Interactions
    node
      .on("click", (e, d) => {
        if (d.type === "project") {
          if (onOpenNote) onOpenNote(d.realId, "project");
        } else {
          onOpenNote && onOpenNote(d.id);
        }
      })
      .on("mouseover", (e, d) => {
        setHoveredNode(d);

        // Highlight connections
        link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#fff" : THEME.link)
          .attr("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);

        node
          .attr("opacity", n => {
            const isConnected = links.some(l =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
            );
            return (n.id === d.id || isConnected) ? 1 : 0.1;
          })
          .attr("fill", n => {
            if (n.id === d.id) return THEME.nodeActive;
            if (n.type === "project") return n.color;
            return THEME.nodeFill;
          });
        label.attr("opacity", n => (n.id === d.id) ? 1 : 0);
      })
      .on("mouseout", () => {
        setHoveredNode(null);

        const q = searchRef.current.toLowerCase().trim();
        const isSearchActive = q.length > 0;

        if (isSearchActive) {
           // Return to Search State
           node.attr("opacity", n => {
             const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
             return match ? 1 : 0.1;
           });

           // Ensure project color is preserved
           node.attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);

           link.attr("stroke", THEME.link).attr("stroke-opacity", 0.1); // Dim links during search
           label.attr("opacity", n => {
              const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
              return match ? 1 : 0;
           });

        } else {
          // Return to Default State
          link.attr("stroke", THEME.link).attr("stroke-opacity", 0.6).attr("opacity", 1);
          node.attr("opacity", 1).attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
          label.attr("opacity", d => (d.val > 2 || activeCluster === d.group) ? 1 : 0);
        }
      });

    // Simulation Tick
    simulation.on("tick", () => {
      link.attr("d", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Multiplier flattens the curve slightly
        if (dr === 0) return "";
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Semantic Zoom: Scale label opacity/size based on zoom level (k)
        const k = event.transform.k;
        label.attr("opacity", d => {
          // If searching, let search logic handle opacity unless we want semantic zoom on top
          if (searchRef.current) {
             const q = searchRef.current.toLowerCase();
             const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
             return match ? 1 : 0;
          }

          if (k > 1.5) return 1;
          // Fainter when zoomed out
          if (k < 0.7 && d.val < 2) return 0.1;
          return 0.5;
        });
      });

    zoomRef.current = zoom; // Store for external access
    svg.call(zoom);

    // Initial Zoom Fit (Delayed)
    setTimeout(() => {
      // Simple approximate center
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2)
      );
    }, 500);

    return () => simulation.stop();
  }, [nodes, links, dims, showSignals, activeCluster, onOpenNote]); // Re-render when data or view options change

  // Resize Handler
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // --- SEARCH VISUAL EFFECT ---
  // Handle "Dimming" and "Highlighting" without restarting simulation
  useEffect(() => {
     if (!svgRef.current) return;
     const svg = d3.select(svgRef.current);
     const node = svg.selectAll(".node-element");
     const label = svg.selectAll(".label-element");
     const link = svg.selectAll(".link-element");

     const q = searchQuery.toLowerCase().trim();

     if (!q) {
        // Reset to default (or handle activeCluster/zoom state if we wanted to be perfect, but default is fine)
        node.style("opacity", 1).style("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
        link.style("opacity", 1).attr("stroke-opacity", 0.6);
        // Let zoom handler or default logic handle labels, but for now reset to semantic baseline
        label.style("opacity", 0.7);
        return;
     }

     // Apply Search Dimming
     node.style("opacity", d => {
        const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
        return match ? 1 : 0.1;
     });

     // Highlight Match? (Maybe make it brighter or larger? Current opacity 1 vs 0.1 is strong enough)

     link.style("opacity", 0.1); // Dim links

     label.style("opacity", d => {
        const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
        return match ? 1 : 0;
     });

  }, [searchQuery, nodes]);


  // --- DRAG HELPER ---
  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  // --- ZOOM HELPER ---
  const handleZoomToNode = (nodeId) => {
    const targetNode = nodesRef.current.find(n => n.id === nodeId);
    if (!targetNode || !svgRef.current || !zoomRef.current) return;

    const width = dims.w;
    const height = dims.h;
    const scale = 1.5; // Zoom level

    d3.select(svgRef.current).transition().duration(1000).call(
      zoomRef.current.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-targetNode.x, -targetNode.y)
    );

    // Also highlight/select it?
    // Maybe set it as hoveredNode for the tooltip
    setHoveredNode(targetNode);
  };

  // Filtered Results for Dropdown
  const searchResults = useMemo(() => {
      if (!searchQuery) return [];
      const q = searchQuery.toLowerCase();
      return nodes.filter(n =>
         (n.title || "").toLowerCase().includes(q) ||
         (n.tags || []).some(t => t.toLowerCase().includes(q))
      ).slice(0, 5); // Top 5
  }, [searchQuery, nodes]);


  // --- UI RENDER ---

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" ref={wrapperRef}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={dottedBg} />

      <svg ref={svgRef} className="w-full h-full block" />

      {/* CONTROLS OVERLAY */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 font-sans pointer-events-none">
        {/* Pointer events none for container, auto for children to allow clicking through gaps */}

        {/* Search Widget */}
        <div className="pointer-events-auto">
             <GlassCard className="w-72 p-3 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl flex flex-col gap-2">
                <div className="relative">
                    <ProjectIcon name="search" size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                    <GlassInput
                        placeholder="Search graph..."
                        className="pl-9 py-2 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                        {searchResults.map(res => (
                            <button
                                key={res.id}
                                onClick={() => handleZoomToNode(res.id)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors text-left"
                            >
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: res.color || "#fff" }} />
                                <div className="min-w-0">
                                    <div className="text-xs text-white truncate">{res.title}</div>
                                    <div className="text-[10px] text-zinc-500 truncate">
                                        {res.type === 'project' ? 'Project' : (res.tags[0] ? `#${res.tags[0]}` : 'Note')}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Filters</span>
                    <button
                        onClick={() => setShowOnlyProjects(!showOnlyProjects)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                            showOnlyProjects
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        {showOnlyProjects ? "Projects Only" : "All Nodes"}
                    </button>
                </div>
             </GlassCard>
        </div>

        {/* Analysis Widget */}
        <div className="pointer-events-auto">
            <GlassCard className="w-64 p-4 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <ProjectIcon name="layers" size={14} className="text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Connexa Analysis</h3>
              </div>

              {/* Signal Toggle */}
              <label className="flex items-center justify-between text-xs font-medium text-zinc-300 cursor-pointer hover:text-white mb-4">
                <span>Show Signals</span>
                <input
                  type="checkbox"
                  checked={showSignals}
                  onChange={e => setShowSignals(e.target.checked)}
                  className="accent-teal-500"
                />
              </label>

              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-zinc-600">Clusters</div>
                <div className="space-y-1">
                  {analysis.rawClusters.slice(0, 5).map((c, i) => (
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
            </GlassCard>
        </div>

        {/* Momentum Widget */}
        <div className="pointer-events-auto">
            <GlassCard className="w-64 p-4 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <ProjectIcon name="zap" size={14} className="text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Momentum</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(analysis.hotTags).slice(0, 10).map(tag => (
                  <span key={tag} className="text-[10px] bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
                {analysis.hotTags.size === 0 && (
                  <span className="text-xs text-zinc-600 italic">No trending tags</span>
                )}
              </div>
            </GlassCard>
        </div>
      </div>

      {/* Hover Info */}
      {hoveredNode && (
        <GlassCard
          className="absolute pointer-events-none z-20 min-w-[200px]"
          style={{ top: 24, right: 24 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full mt-1" style={{ background: hoveredNode.color }} />
            <div>
              <div className="text-white font-medium text-sm leading-tight">{hoveredNode.title}</div>
              <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-1">
                {hoveredNode.tags.length > 0
                  ? hoveredNode.tags.map(t => <span key={t} className="bg-white/5 px-1 rounded">#{t}</span>)
                  : <span className="italic opacity-50">No tags</span>}
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-zinc-500 uppercase tracking-widest">
                Click to open
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

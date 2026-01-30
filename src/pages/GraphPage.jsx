// @maia:graph
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { dottedBg } from "../lib/theme.js";
import { calculateVelocity, findClusters } from "../lib/analysis/index.js";
import { GlassCard } from "../components/GlassCard";
import ProjectIcon from "../components/ProjectIcon";
import { useGraphSimulation } from "../hooks/useGraphSimulation";

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

/**
 * GraphPage Component
 * Renders the interactive force-directed graph of Notes and Projects.
 *
 * @param {Object} props
 * @param {Array} props.notes - List of note objects
 * @param {Array} props.projects - List of project objects
 * @param {Function} props.onOpenNote - Callback when a node is clicked (id, type)
 */
export default function GraphPage({ notes, projects = [], onOpenNote }) {
  const wrapperRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);
  const [showSignals, setShowSignals] = useState(true);

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
    const noteNodes = notes.map((n) => {
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

    const allNodes = [...noteNodes, ...projectNodes];
    const idByTitle = new Map(notes.map((n) => [normalize(n.title), n.id]));
    const d3Links = [];

    // 3. Links
    notes.forEach((n) => {
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

    return { nodes: allNodes, links: d3Links };
  }, [notes, projects, analysis]);


  // --- INTERACTION CALLBACKS ---

  const handleNodeClick = useCallback((d) => {
    if (d.type === "project") {
      if (onOpenNote) onOpenNote(d.realId, "project");
    } else {
      if (onOpenNote) onOpenNote(d.id);
    }
  }, [onOpenNote]);

  const handleNodeHover = useCallback((d, { link, node, label }) => {
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
  }, [links]); // Depends on links structure

  const handleNodeOut = useCallback((d, { link, node, label }) => {
    setHoveredNode(null);
    link.attr("stroke", THEME.link).attr("stroke-opacity", 0.6);

    // Reset Node Styles (respecting signals)
    node
      .attr("opacity", 1)
      .attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill)
      .attr("stroke", n => (showSignals && n.isHot) ? "#f472b6" : "none")
      .attr("stroke-width", n => (showSignals && n.isHot) ? 2 : 0);

    // Reset Label Styles (respecting cluster)
    label.attr("opacity", n => {
        if (activeCluster !== null) return n.group === activeCluster ? 1 : 0.1;
        return n.val > 2 ? 0.7 : 0;
    });
  }, [activeCluster, showSignals]);


  // --- HOOK ---

  const svgRef = useGraphSimulation({
    nodes,
    links,
    dims,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onNodeOut: handleNodeOut,
  });


  // --- VISUAL UPDATES (Side Effects) ---
  // Handle activeCluster, showSignals, and simulation resets (nodes/dims)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Update Nodes (Signals & Pulse)
    const nodeSelection = svg.selectAll(".node");

    nodeSelection
       .attr("stroke", d => (showSignals && d.isHot) ? "#f472b6" : "none")
       .attr("stroke-width", d => (showSignals && d.isHot) ? 2 : 0);

    // Add pulse class to projects
    nodeSelection
       .filter(d => d.type === 'project')
       .classed("pulse-project", true);

    // Update Labels (Cluster Filter)
    svg.selectAll(".label")
       .transition().duration(200)
       .attr("opacity", d => {
          if (activeCluster !== null) {
              return d.group === activeCluster ? 1 : 0.1;
          }
          return d.val > 2 ? 0.7 : 0;
       });

  }, [activeCluster, showSignals, svgRef, nodes, dims]); // Depend on state that affects visuals


  // --- RESIZE HANDLER ---

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);


  // --- UI RENDER ---

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" ref={wrapperRef}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={dottedBg} />

      {/* Visual Polish Styles */}
      <style>{`
        @keyframes glow-blue {
          0%, 100% { filter: drop-shadow(0 0 2px #3b82f6); }
          50% { filter: drop-shadow(0 0 6px #3b82f6); }
        }
        .pulse-project {
          animation: glow-blue 3s infinite;
        }
      `}</style>

      <svg ref={svgRef} className="w-full h-full block" />

      {/* CONTROLS OVERLAY */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 font-sans">
        {/* Analysis Widget */}
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

        {/* Momentum Widget */}
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

      {/* Hover Info */}
      {hoveredNode && (
        <GlassCard
          className="absolute pointer-events-none z-20 min-w-[200px] animate-in fade-in zoom-in-95 duration-200"
          style={{ top: 24, right: 24 }}
        >
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${hoveredNode.type === 'project' ? 'animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`}
                 style={{ background: hoveredNode.color }}
            />
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

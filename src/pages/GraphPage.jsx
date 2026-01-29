// @maia:graph
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { dottedBg } from "../lib/theme.js";
import { calculateVelocity, findClusters } from "../lib/analysis/index.js";

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
  nodeFill: "#18181b", // zinc-900
  nodeStroke: "#3f3f46", // zinc-700
  link: "#27272a", // zinc-800
  text: "#a1a1aa", // zinc-400
  textActive: "#f4f4f5", // zinc-100
};

export default function GraphPage({ notes, onOpenNote }) {
  const svgRef = useRef(null);
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
    // We map note -> velocity based on its tags? 
    // Or just identifying "Trending" notes if they contain trending tags.
    const velocityStats = calculateVelocity(notes);
    const hotTags = new Set(velocityStats.filter(v => v.velocity > 0).map(v => v.tag));

    // Helper to check if note is "Hot"
    const isHot = (n) => (n.tags || []).some(t => hotTags.has(t));

    return { rawClusters, clusterMap, isHot, hotTags };
  }, [notes]);

  // --- GRAPH DATA PREP ---

  const { nodes, links } = useMemo(() => {
    const normalize = (s) => (s || "").trim().toLowerCase();

    // Map notes to D3 nodes
    const d3Nodes = notes.map((n) => {
      const clusterIdx = analysis.clusterMap.get(n.id);
      const clusterColor = clusterIdx !== undefined ? COLORS[clusterIdx % COLORS.length] : THEME.nodeStroke;

      return {
        id: n.id,
        title: n.title || "Untitled",
        group: clusterIdx,
        color: clusterColor,
        isHot: analysis.isHot(n),
        tags: n.tags || [],
        val: 1 + (n.content?.length || 0) / 1000, // Size by content length?
      };
    });

    const idByTitle = new Map(notes.map((n) => [normalize(n.title), n.id]));
    const d3Links = [];

    notes.forEach((n) => {
      const sourceId = n.id;
      // Internal Link Parsing could be duplicated logic or use extractLinks util if exposed
      // sticking to simple regex here for speed/independence or reusing existing pattern
      const matches = (n.content || "").match(/\[\[(.+?)\]\]/g) || [];
      matches.forEach((m) => {
        const t = m.slice(2, -2).trim();
        const targetId = idByTitle.get(normalize(t));
        if (targetId && targetId !== sourceId) {
          d3Links.push({ source: sourceId, target: targetId });
        }
      });
    });

    return { nodes: d3Nodes, links: d3Links };
  }, [notes, analysis]);


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
    const linkLayer = g.append("g").attr("class", "links");
    const nodeLayer = g.append("g").attr("class", "nodes");
    const labelLayer = g.append("g").attr("class", "labels");

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => 15 + d.val).strength(0.8));

    // Elements
    const link = linkLayer.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", THEME.link)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    const node = nodeLayer.selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => 6 + Math.sqrt(d.val * 3))
      .attr("fill", THEME.nodeFill)
      .attr("stroke", d => showSignals ? d.color : THEME.nodeStroke)
      .attr("stroke-width", d => d.isHot && showSignals ? 3 : 1.5)
      .style("cursor", "pointer")
      .call(drag(simulation));

    const label = labelLayer.selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.title)
      .attr("font-size", 10)
      .attr("fill", THEME.text)
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("opacity", d => (d.val > 2 || activeCluster === d.group) ? 1 : 0) // Hide labels for small nodes unless active
      .style("pointer-events", "none");


    // Interactions
    node
      .on("click", (e, d) => onOpenNote && onOpenNote(d.id))
      .on("mouseover", (e, d) => {
        setHoveredNode(d);
        // Highlight connections
        link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#fff" : THEME.link)
          .attr("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
        node.attr("opacity", n => {
          const isConnected = links.some(l =>
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id)
          );
          return (n.id === d.id || isConnected) ? 1 : 0.1;
        });
        label.attr("opacity", n => (n.id === d.id) ? 1 : 0);
      })
      .on("mouseout", () => {
        setHoveredNode(null);
        link.attr("stroke", THEME.link).attr("stroke-opacity", 0.6);
        node.attr("opacity", 1);
        label.attr("opacity", d => (d.val > 2 || activeCluster === d.group) ? 1 : 0);
      });

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

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
      .on("zoom", (event) => g.attr("transform", event.transform));

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
  }, [nodes, links, dims, showSignals, activeCluster]); // Re-render when data or view options change

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

  // --- UI RENDER ---

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" ref={wrapperRef}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={dottedBg} />

      <svg ref={svgRef} className="w-full h-full block" />

      {/* CONTROLS OVERLAY */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-black/80 backdrop-blur border border-zinc-800 p-3 rounded-lg w-64">
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Connexa Analysis</h3>

          {/* Signal Toggle */}
          <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer hover:text-white mb-4">
            <span>Show Signals</span>
            <input
              type="checkbox"
              checked={showSignals}
              onChange={e => setShowSignals(e.target.checked)}
              className="accent-zinc-500"
            />
          </label>

          {/* Clusters List */}
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-600 uppercase">Top Clusters</div>
            {analysis.rawClusters.slice(0, 5).map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                className={`w-full text-left text-xs px-2 py-1 rounded flex items-center justify-between ${activeCluster === i
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900"
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

        {/* Trending Tags Widget */}
        <div className="bg-black/80 backdrop-blur border border-zinc-800 p-3 rounded-lg w-64">
          <div className="text-[10px] text-zinc-600 uppercase mb-2">Momentum (Velocity)</div>
          <div className="flex flex-wrap gap-1">
            {Array.from(analysis.hotTags).slice(0, 8).map(tag => (
              <span key={tag} className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {analysis.hotTags.size === 0 && (
              <span className="text-xs text-zinc-700 italic">No trending tags</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Info */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-20 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl"
          style={{ top: 20, right: 20 }} // Simple fixed link for now, or follow mouse
        >
          <div className="text-zinc-100 font-medium text-sm">{hoveredNode.title}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {hoveredNode.tags.length > 0 ? hoveredNode.tags.map(t => `#${t}`).join(" ") : "No tags"}
          </div>
        </div>
      )}
    </div>
  );
}

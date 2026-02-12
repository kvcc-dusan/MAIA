// @maia:graph
import React, { useEffect, useMemo, useRef, useState } from "react";
import { select, zoomIdentity } from "d3";
import { calculateVelocity, findClusters } from "../../../lib/analysis/index.js";
import { GlassCard } from "../../../components/GlassCard";
import GraphRenderer from "../components/GraphRenderer.jsx";
import GraphControls from "../components/GraphControls.jsx";

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

  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);

  // Search & Filter State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyProjects, setShowOnlyProjects] = useState(false);
  const [showOrphans, setShowOrphans] = useState(true);
  const [showGhostNodes, setShowGhostNodes] = useState(false);

  // Display & Physics with Persistence
  const [nodeSize, setNodeSize] = useState(() => parseFloat(localStorage.getItem('maia_graph_nodeSize')) || 1);
  const [linkThickness, setLinkThickness] = useState(() => parseFloat(localStorage.getItem('maia_graph_linkThickness')) || 1.5);
  const [fontSize, setFontSize] = useState(() => parseFloat(localStorage.getItem('maia_graph_fontSize')) || 1);
  const [repelForce, setRepelForce] = useState(() => parseInt(localStorage.getItem('maia_graph_repelForce')) || 150);
  const [linkDistance, setLinkDistance] = useState(() => parseInt(localStorage.getItem('maia_graph_linkDistance')) || 100);

  // Persistence Effects
  useEffect(() => localStorage.setItem('maia_graph_nodeSize', nodeSize), [nodeSize]);
  useEffect(() => localStorage.setItem('maia_graph_linkThickness', linkThickness), [linkThickness]);
  useEffect(() => localStorage.setItem('maia_graph_fontSize', fontSize), [fontSize]);
  useEffect(() => localStorage.setItem('maia_graph_repelForce', repelForce), [repelForce]);
  useEffect(() => localStorage.setItem('maia_graph_linkDistance', linkDistance), [linkDistance]);

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

    let allNodes = [...noteNodes, ...projectNodes];
    const idByTitle = new Map(notes.map((n) => [normalize(n.title), n.id]));
    const d3Links = [];
    const ghostNodesMap = new Map(); // title -> node

    // 3. Links & Orphans & Ghosts
    notes.forEach((n) => {
      if (showOnlyProjects) return;

      const sourceId = n.id;
      let hasLinks = false;

      // Note -> Note (Mentions)
      const matches = (n.content || "").match(/\[\[(.+?)\]\]/g) || [];
      matches.forEach((m) => {
        const t = m.slice(2, -2).trim();
        const normT = normalize(t);
        const targetId = idByTitle.get(normT);

        if (targetId && targetId !== sourceId) {
          d3Links.push({ source: sourceId, target: targetId });
          hasLinks = true;
        } else if (!targetId && showGhostNodes && t) {
          // Ghost Node Concept
          if (!ghostNodesMap.has(normT)) {
            const ghostNode = {
              id: `ghost-${normT}`,
              title: t,
              type: 'ghost',
              color: '#3f3f46', // Zinc 700
              val: 1,
              tags: ['Missing'],
            };
            ghostNodesMap.set(normT, ghostNode);
            allNodes.push(ghostNode);
          }
          d3Links.push({ source: sourceId, target: ghostNodesMap.get(normT).id });
          hasLinks = true;
        }
      });

      // Note -> Project
      projects.forEach(p => {
        const isLinked = (n.projectIds && n.projectIds.includes(p.id)) ||
          (n.project && normalize(n.project) === normalize(p.name));
        if (isLinked) {
          d3Links.push({ source: sourceId, target: `proj-${p.id}` });
          hasLinks = true;
        }
      });

      // Mark as orphan if needed
      if (!hasLinks && !showOrphans) {
        n._orphan = true;
      }
    });

    // 4. Filter Orphans
    if (!showOrphans) {
      // Determine connectivity set
      const connected = new Set();
      d3Links.forEach(l => { connected.add(l.source); connected.add(l.target); });
      allNodes = allNodes.filter(n => n.type === 'project' || n.type === 'ghost' || connected.has(n.id));
    }

    return { nodes: allNodes, links: d3Links };
  }, [notes, projects, analysis, showOnlyProjects, showGhostNodes, showOrphans]);


  // --- ZOOM HELPER (Passed to Controls) ---
  const handleZoomToNode = (nodeId) => {
    const targetNode = nodesRef.current.find(n => n.id === nodeId);
    if (!targetNode || !svgRef.current || !zoomRef.current) return;

    const width = dims.w;
    const height = dims.h;
    const scale = 1.5; // Zoom level

    select(svgRef.current).transition().duration(1000).call(
      zoomRef.current.transform,
      zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-targetNode.x, -targetNode.y)
    );

    setHoveredNode(targetNode);
  };

  // Filtered Results for Dropdown (Passed to Controls)
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter(n =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    ).slice(0, 5); // Top 5
  }, [searchQuery, nodes]);

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

  console.log("GraphPage: Nodes", nodes.length, "Links", links.length); // Debug log

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">

      <GraphRenderer
        nodes={nodes}
        links={links}
        dims={dims}
        activeCluster={activeCluster}
        onOpenNote={onOpenNote}
        nodeSize={nodeSize}
        linkThickness={linkThickness}
        fontSize={fontSize}
        repelForce={repelForce}
        linkDistance={linkDistance}
        query={searchQuery} // Pass as query
        setHoveredNode={setHoveredNode}
        wrapperRef={wrapperRef}
        svgRef={svgRef}
        zoomRef={zoomRef}
        nodesRef={nodesRef}
        searchRef={searchRef}
      />

      <GraphControls
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        handleZoomToNode={handleZoomToNode}
        showOnlyProjects={showOnlyProjects}
        setShowOnlyProjects={setShowOnlyProjects}
        showOrphans={showOrphans}
        setShowOrphans={setShowOrphans}
        showGhostNodes={showGhostNodes}
        setShowGhostNodes={setShowGhostNodes}
        nodeSize={nodeSize}
        setNodeSize={setNodeSize}
        linkThickness={linkThickness}
        setLinkThickness={setLinkThickness}
        fontSize={fontSize}
        setFontSize={setFontSize}
        repelForce={repelForce}
        setRepelForce={setRepelForce}
        linkDistance={linkDistance}
        setLinkDistance={setLinkDistance}
        hotTags={analysis.hotTags}
        activeCluster={activeCluster}
        setActiveCluster={setActiveCluster}
        clusters={analysis.rawClusters}
      />

      {/* Hover Info Card */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-20 min-w-[200px] max-w-[260px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl font-mono"
          style={{ top: 80, right: 24 }}
        >
          <div className="text-white font-medium text-xs leading-tight">{hoveredNode.title}</div>
          <div className="text-[10px] text-zinc-500 mt-2 flex flex-wrap gap-1">
            {hoveredNode.tags.length > 0
              ? hoveredNode.tags.map(t => <span key={t} className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">#{t}</span>)
              : <span className="italic opacity-50">No tags</span>}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Click to open
          </div>
        </div>
      )}
    </div>
  );
}

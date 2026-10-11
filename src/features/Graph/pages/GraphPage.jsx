// @maia:graph
import React, { useEffect, useMemo, useRef, useState } from "react";
import { select, zoomIdentity } from "d3";
import { calculateVelocity, findClusters } from "../../../lib/analysis/index.js";
import { noteTags } from "../../../lib/noteTags.js";
import { Network } from "lucide-react";
import GraphRenderer from "../components/GraphRenderer.jsx";
import GraphControls from "../components/GraphControls.jsx";
import GraphHoverCard from "../components/GraphHoverCard.jsx";
import { assignGroups } from "../lib/graphGroups.js";
import { intToHex } from "../lib/colorConvert.js";
import { useGraphView } from "../hooks/useGraphView.js";
import { useGroupColors } from "../hooks/useGroupColors.js";
import { isHotNode } from "../lib/hot.js";
import { useThemeTokens } from "../hooks/useThemeTokens.js";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import { Alert } from "@/components/arc/alert/alert";
import styles from "./GraphPage.module.css";

// three.js and 3d-force-graph load only when the 3D view is shown.
const Graph3DRenderer = React.lazy(() => import("../components/Graph3DRenderer.jsx"));

// Canvas colors come from the design tokens (lib/tokens.js) and follow the
// theme. They are NOT stored on node data: changing node objects would restart
// the simulation and reset every position.

export default function GraphPage({ notes, projects = [], onOpenNote }) {
  const { theme, colors } = useThemeTokens();

  const svgRef = useRef(null);
  const wrapperRef = useRef(null);
  const zoomRef = useRef(null); // Store zoom behavior
  const graph3dRef = useRef(null); // Imperative handle of the 3D scene
  const view = useGraphView();
  const is3d = view.mode === "3d";

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

    const isHot = (n) => isHotNode(noteTags(n), hotTags);

    return { rawClusters, clusterMap, isHot, hotTags };
  }, [notes]);

  // --- GRAPH DATA PREP ---

  const { nodes, links } = useMemo(() => {
    const normalize = (s) => (s || "").trim().toLowerCase();

    // 1. Note Nodes
    let noteNodes = notes.map((n) => {
      const clusterIdx = analysis.clusterMap.get(n.id);

      return {
        id: n.id,
        title: n.title || "Untitled",
        type: "note",
        group: clusterIdx,
        isHot: analysis.isHot(n),
        tags: noteTags(n),
        folder: n.folder || "",
        val: 1, // Fixed base size (content length sizing disabled)
        projectIds: n.projectIds || [],
      };
    });

    // 2. Project Nodes
    const projectNodes = projects.map(p => ({
      id: `proj-${p.id}`,
      realId: p.id,
      title: p.name,
      type: "project",
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
        const isLinked = n.projectIds && n.projectIds.includes(p.id);
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
    if (is3d) {
      graph3dRef.current?.focusNode(nodeId);
      setHoveredNode(nodes.find((n) => n.id === nodeId) || null);
      return;
    }
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

  // Search-result dot: cluster hue for notes, neutral for projects and ghosts.
  const nodeDotColor = (n) =>
    n.type === "note" && n.group !== undefined ? colors[n.group % colors.length] : theme.text;

  const resetFilters = () => {
    setShowOnlyProjects(false);
    setShowOrphans(true);
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

  // Enter in the search box opens the first match: the pointer-free way in.
  const openNode = (node) => {
    if (node.type === "project") onOpenNote?.(node.realId, "project");
    else onOpenNote?.(node.id);
  };
  const openFirstResult = () => {
    if (searchResults[0]) openNode(searchResults[0]);
  };

  // Group colours for the 3D view (folder or tag), and the legend that explains them.
  const grouping = useMemo(() => assignGroups(nodes, view.colorBy), [nodes, view.colorBy]);
  const groupColors = useGroupColors(theme, colors, grouping.groups);
  const legend = useMemo(
    () => grouping.groups.map((g) => ({ ...g, color: intToHex(groupColors.colors.get(g.key) ?? groupColors.neutral) })),
    [grouping.groups, groupColors],
  );

  // Resize Handler (2D only: the 3D scene observes its own container)
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [is3d]);

  const hasContent = notes.length > 0 || projects.length > 0;
  const filtersActive = showOnlyProjects || !showOrphans;

  return (
    <div className={styles.page}>

      {is3d ? (
        <React.Suspense fallback={<div className={styles.loading} role="status" aria-busy="true">Loading 3D graph</div>}>
          <Graph3DRenderer
            nodes={nodes}
            links={links}
            groupOf={grouping.groupOf}
            groupColors={groupColors}
            activeCluster={activeCluster}
            onOpenNote={onOpenNote}
            nodeSize={nodeSize}
            linkThickness={linkThickness}
            fontSize={fontSize}
            repelForce={repelForce}
            linkDistance={linkDistance}
            groupByFolder={view.groupByFolder}
            query={searchQuery}
            setHoveredNode={setHoveredNode}
            controllerRef={graph3dRef}
            onUnavailable={view.markWebglUnavailable}
          />
        </React.Suspense>
      ) : (
        <GraphRenderer
          nodes={nodes}
          links={links}
          dims={dims}
          theme={theme}
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
      )}

      {view.webglFailed && (
        <Alert className={styles.notice} tone="warning" title="3D view is not available">
          WebGL could not start here, so this is the 2D graph. Pick 3D again to retry.
        </Alert>
      )}

      {nodes.length === 0 && (
        <div className={styles.empty}>
          <EmptyState
            size="page"
            icon={Network}
            title={hasContent ? "No nodes match these filters" : "Nothing to graph yet"}
            description={hasContent
              ? "Your filters hide every note and project."
              : "Notes and projects appear here. Link notes with [[double brackets]] to connect them."}
            action={hasContent && filtersActive
              ? <Button variant="secondary" onClick={resetFilters}>Reset filters</Button>
              : undefined}
          />
        </div>
      )}

      <GraphControls
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        handleZoomToNode={handleZoomToNode}
        onOpenNode={openNode}
        view={{
          mode: view.mode,
          setMode: view.setViewMode,
          colorBy: view.colorBy,
          setColorBy: view.setColorBy,
          groupByFolder: view.groupByFolder,
          setGroupByFolder: view.setGroupByFolder,
          legend,
        }}
        onSearchSubmit={openFirstResult}
        values={{ showOnlyProjects, showOrphans, showGhostNodes, nodeSize, linkThickness, fontSize, repelForce, linkDistance }}
        setters={{ showOnlyProjects: setShowOnlyProjects, showOrphans: setShowOrphans, showGhostNodes: setShowGhostNodes, nodeSize: setNodeSize, linkThickness: setLinkThickness, fontSize: setFontSize, repelForce: setRepelForce, linkDistance: setLinkDistance }}
        hotTags={analysis.hotTags}
        activeCluster={activeCluster}
        setActiveCluster={setActiveCluster}
        clusters={analysis.rawClusters}
        colors={colors}
        nodeDotColor={nodeDotColor}
      />

      <GraphHoverCard node={hoveredNode} />
    </div>
  );
}

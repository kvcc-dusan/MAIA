// @maia:graph-3d
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cssVar } from "@/lib/tokens";
import { buildGraphData, clusterMembers, matchNodes } from "../lib/graphData3d.js";
import { createGraphScene } from "../lib/graph3dScene.js";
import styles from "./Graph3DRenderer.module.css";

const DESCRIPTION =
  "3D knowledge graph. Drag to orbit, scroll to zoom, arrow keys to pan. Use the search box to find a note, then press Enter to open it.";

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 3D twin of GraphRenderer: same node/link/control inputs, same outputs
 * (open a note, hover data). The scene is created once; props only update it.
 * Lazy-loaded by GraphPage so three.js stays out of the main bundle.
 */
function Graph3DRenderer({
  nodes,
  links,
  groupOf,
  groupColors,
  activeCluster,
  onOpenNote,
  nodeSize,
  linkThickness,
  fontSize,
  repelForce,
  linkDistance,
  query = "",
  setHoveredNode,
  controllerRef,
  onUnavailable,
}) {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const dataRef = useRef(null);
  const [announcement, setAnnouncement] = useState("");

  // Callbacks are read through a ref so the scene never needs to be rebuilt for them.
  const latest = useRef({});
  latest.current = { onOpenNote, setHoveredNode, onUnavailable };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    let scene;
    try {
      scene = createGraphScene({
        container: stage,
        reducedMotion: prefersReducedMotion(),
        onHover: (node) => {
          latest.current.setHoveredNode?.(node);
          setAnnouncement(node ? node.title : "");
        },
        onNodeClick: (node) => {
          const open = latest.current.onOpenNote;
          if (node.type === "project") open?.(node.realId, "project");
          else open?.(node.id);
          setAnnouncement(`Opening ${node.title}`);
        },
        onContextLost: () => latest.current.onUnavailable?.("lost"),
      });
    } catch (error) {
      latest.current.onUnavailable?.(error);
      return undefined;
    }
    sceneRef.current = scene;
    if (controllerRef) controllerRef.current = scene;

    const resize = () => scene.setSize(stage.clientWidth, stage.clientHeight);
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    // Rendering pauses when the tab is hidden or the graph is scrolled/hidden away.
    let inView = true;
    const syncPause = () => scene.setPaused(document.hidden || !inView);
    const viewObserver = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          inView = entries[entries.length - 1].isIntersecting;
          syncPause();
        })
      : null;
    viewObserver?.observe(stage);
    document.addEventListener("visibilitychange", syncPause);

    return () => {
      document.removeEventListener("visibilitychange", syncPause);
      viewObserver?.disconnect();
      resizeObserver.disconnect();
      scene.destroy();
      sceneRef.current = null;
      dataRef.current = null;
      if (controllerRef) controllerRef.current = null;
    };
  }, [controllerRef]);

  const style = useMemo(
    () => ({
      ...groupColors,
      groupOf,
      nodeSize,
      linkThickness,
      fontSize,
      repelForce,
      linkDistance,
      fontFace: cssVar("--font-body") || "sans-serif",
    }),
    [groupColors, groupOf, nodeSize, linkThickness, fontSize, repelForce, linkDistance],
  );

  useEffect(() => {
    sceneRef.current?.setStyle(style);
  }, [style]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const data = buildGraphData(nodes, links, dataRef.current);
    dataRef.current = data;
    scene.setData(data);
    // A fresh data set may change what matches, so highlight is re-derived below.
  }, [nodes, links]);

  useEffect(() => {
    const scene = sceneRef.current;
    const data = dataRef.current;
    if (!scene || !data) return;
    scene.setHighlight({
      matchIds: matchNodes(data.nodes, query),
      clusterIds: clusterMembers(data.nodes, activeCluster),
    });
  }, [query, activeCluster, nodes, links]);

  return (
    <div className={styles.canvas}>
      <div ref={stageRef} className={styles.stage} tabIndex={0} role="group" aria-label={DESCRIPTION} />
      <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}

export default React.memo(Graph3DRenderer);

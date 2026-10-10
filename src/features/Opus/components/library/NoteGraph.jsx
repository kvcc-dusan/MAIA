import React, { useEffect, useRef } from "react";
import { subscribe } from "@/lib/theme.js";
import { buildGraph, graphSignature, GRAPH_FALLBACK_SIZE } from "./graphModel";
import { createGraphScene } from "./graphScene";
import styles from "./NoteGraph.module.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Force graph of the project's linked notes. The scene is rebuilt only when a
 * note appears, goes or is renamed (see graphSignature); everything else
 * (re-renders, resizes, a theme switch) updates it in place, so the layout the
 * user arranged survives.
 */
export default function NoteGraph({ project, notes, onOpenNote }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const sceneRef = useRef(null);
  const positions = useRef(new Map()).current;
  const latest = useRef({ project, notes, onOpenNote });
  // Declared before the build effect so it runs first in the same commit.
  useEffect(() => {
    latest.current = { project, notes, onOpenNote };
  });

  const signature = graphSignature(project, notes);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return undefined;
    const { project: currentProject, notes: currentNotes } = latest.current;
    const size = {
      w: svgEl.clientWidth || GRAPH_FALLBACK_SIZE.w,
      h: svgEl.clientHeight || GRAPH_FALLBACK_SIZE.h,
    };
    const { nodes, links } = buildGraph({ project: currentProject, notes: currentNotes, size, positions });
    const scene = createGraphScene(svgEl, {
      nodes,
      links,
      size,
      idPrefix: currentProject.id,
      reduceMotion: prefersReducedMotion(),
      onOpenNote: (id) => latest.current.onOpenNote?.(id),
    });
    sceneRef.current = scene;
    const unsubscribe = subscribe(scene.refreshColors);

    return () => {
      unsubscribe();
      nodes.forEach((n) => positions.set(n.id, { x: n.x, y: n.y }));
      scene.destroy();
      sceneRef.current = null;
    };
  }, [signature, positions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) sceneRef.current?.resize(width, height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.root}>
      <svg
        ref={svgRef}
        className={styles.svg}
        role="group"
        aria-label={`Graph of notes linked to ${project.name}. Scroll or tab through the notes, or switch to the list view.`}
      />
    </div>
  );
}

// @maia:graph
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { dottedBg } from "../lib/theme.js";

export default function GraphView({ notes, onOpenNote }) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const normalize = (s) => (s || "").trim().toLowerCase();

  // Visual constants — tweak to taste
  const RADIUS = 10;
  const LINK_COLOR = "#e4e4e7"; // node-matching white-ish
  const LINK_WIDTH = 0.5;       // line thickness
  const NODE_FILL = "#e4e4e7";
  const LABEL_FILL = "#e4e4e7";
  const LABEL_FONT_SIZE = 16;
  const LABEL_OFFSET = RADIUS + 16; // space below dot

  const { nodes, links } = useMemo(() => {
    const nodes = notes.map((n) => ({ id: n.id, title: n.title || "Untitled" }));
    const idByTitle = new Map(notes.map((n) => [normalize(n.title), n.id]));
    const links = [];
    notes.forEach((n) => {
      (n.links || []).forEach((title) => {
        const target = idByTitle.get(normalize(title));
        if (target) links.push({ source: n.id, target });
      });
    });
    return { nodes, links };
  }, [notes]);

  // Debounced/thresholded resize to avoid tiny jitter restarts
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const w = svgRef.current?.clientWidth || 800;
      const h = svgRef.current?.clientHeight || 600;
      if (Math.abs(w - dims.w) > 2 || Math.abs(h - dims.h) > 2) {
        setDims({ w, h });
      }
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [dims.w, dims.h]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Links
    const link = g
      .append("g")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-width", LINK_WIDTH) // ← thickness
      .selectAll("line")
      .data(links)
      .enter()
      .append("line");

    // Simulation with soft gravity & collision
    const centerX = dims.w / 2;
    const centerY = dims.h / 2;

    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(120).strength(0.9))
      .force("charge", d3.forceManyBody().strength(-90).distanceMax(400))
      .force("collide", d3.forceCollide().radius(RADIUS + 8).strength(0.9))
      .force("x", d3.forceX(centerX).strength(0.03))
      .force("y", d3.forceY(centerY).strength(0.03))
      .alpha(0.9);

    // Nodes (group so circle + label move together)
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d) => {
        if (event.defaultPrevented) return;
        onOpenNote && onOpenNote(d.id);
      });

    // Dot
    node.append("circle").attr("r", RADIUS).attr("fill", NODE_FILL);

    // Label UNDER the dot, centered
    node
      .append("text")
      .text((d) => d.title)
      .attr("x", 0)
      .attr("y", LABEL_OFFSET)
      .attr("text-anchor", "middle")
      .attr("font-size", LABEL_FONT_SIZE)
      .attr("fill", LABEL_FILL)
      .attr("pointer-events", "none"); // labels shouldn't intercept clicks

    // Ticking
    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // --- Zoom / Pan ----------------------------------------------------------
    // Dynamic min scale: more nodes => allow deeper unzoom
    const minScale = Math.max(0.01, Math.min(0.1, 4 / Math.sqrt((nodes.length || 1))));
    const zoomed = (event) => g.attr("transform", event.transform);
    const zoom = d3.zoom().scaleExtent([minScale, 3]).on("zoom", zoomed);

    svg.call(zoom);

    // Zoom-to-fit helper (double-click background or press "F")
  function zoomToFit(padding = 120, duration = 280) {
  if (!nodes.length) return;

  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Base fit scale using generous padding -> more “unzoomed”
  const fitScale = Math.min(
    (dims.w - padding * 2) / width,
    (dims.h - padding * 2) / height
  );

  // Respect zoom extents, then apply a slight unzoom bias
  const extent = zoom.scaleExtent();
  const clamped = Math.max(extent[0], Math.min(extent[1], fitScale));

  const BIAS = 0.88; // 0.85–0.95: lower = further zoomed out
  const k = Math.max(extent[0], Math.min(extent[1], clamped * BIAS));

  const tx = dims.w / 2 - (minX + width / 2) * k;
  const ty = dims.h / 2 - (minY + height / 2) * k;

  svg.transition().duration(duration).call(
    zoom.transform,
    d3.zoomIdentity.translate(tx, ty).scale(k)
  );
}


    // Fit when the simulation cools down
    sim.on("end", () => zoomToFit(120, 350));

    // Double-click background = fit (disable default dblclick zoom)
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", (event) => {
      // ignore dblclicks on nodes
      if (event.target.tagName.toLowerCase() === "circle" || event.target.tagName.toLowerCase() === "text") return;
      zoomToFit(120, 250); 
    });

    // Keyboard "F" -> fit
    const onKey = (e) => {
      if (e.key.toLowerCase() === "f") zoomToFit(120, 250); 
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      sim.stop();
    };
  }, [nodes, links, dims, onOpenNote]);

  return (
    <div className="h-full" style={dottedBg}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

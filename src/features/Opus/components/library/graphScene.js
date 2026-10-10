// D3 scene for the notes mini-graph: owns the SVG and the force simulation.
// React decides when to build and destroy it (NoteGraph), so a re-render never
// touches the layout.
import { select, drag, zoom, zoomIdentity, forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3";
import { readGraphColors } from "./graphColors";
import { LABEL_LIMIT, NOTE_HIT_RADIUS, NOTE_RADIUS, PROJECT_RADIUS, truncate } from "./graphModel";

const ZOOM_EXTENT = [0.3, 4];
// Labels live outside the zoomed layer so they stay readable at any scale.
const LABEL_GAP_PX = 14;
const SETTLE_TICKS = 300;
const RESIZE_TICKS = 60;
const RESIZE_ALPHA = 0.15;

// A plain wheel scroll over the graph scrolls the page; zooming takes ctrl or
// cmd (a trackpad pinch arrives as ctrl+wheel).
const zoomFilter = (event) =>
  (event.type === "wheel" ? event.ctrlKey || event.metaKey : !event.ctrlKey) && !event.button;

const makeDrag = (sim) =>
  drag()
    .on("start", (event) => {
      if (!event.active) sim.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on("drag", (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on("end", (event) => {
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

export const createGraphScene = (svgEl, { nodes, links, size, idPrefix, reduceMotion, onOpenNote }) => {
  const svg = select(svgEl);
  svg.selectAll("*").remove();

  let colors = readGraphColors();
  let activeId = null;
  let view = zoomIdentity;

  // Read before forceLink swaps the id strings for node objects.
  const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
  links.forEach((l) => {
    neighbors.get(l.source)?.add(l.target);
    neighbors.get(l.target)?.add(l.source);
  });

  const patternId = `dots-${idPrefix}`;
  const dot = svg
    .append("defs")
    .append("pattern")
    .attr("id", patternId)
    .attr("width", 20)
    .attr("height", 20)
    .attr("patternUnits", "userSpaceOnUse")
    .append("circle")
    .attr("cx", 10)
    .attr("cy", 10)
    .attr("r", 0.9);
  svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", `url(#${patternId})`).style("pointer-events", "none");

  const world = svg.append("g");
  const linkLayer = world.append("g");
  const nodeLayer = world.append("g");
  const labelLayer = svg.append("g").attr("aria-hidden", "true").style("pointer-events", "none");

  const sim = forceSimulation(nodes)
    .force("link", forceLink(links).id((d) => d.id).distance(60).strength(0.45))
    .force("charge", forceManyBody().strength(-85))
    .force("collide", forceCollide().radius((d) => (d.type === "project" ? 20 : 13)).strength(0.85))
    .force("cx", forceX(size.w / 2).strength(0.04))
    .force("cy", forceY(size.h / 2).strength(0.04))
    .alphaDecay(0.012)
    .velocityDecay(0.38)
    .alpha(1);

  const link = linkLayer.selectAll("line").data(links).join("line").style("pointer-events", "none");

  const node = nodeLayer
    .selectAll("g")
    .data(nodes, (d) => d.id)
    .join("g")
    .attr("data-type", (d) => d.type);

  node.filter((d) => d.type === "note")
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) => `Open note: ${d.title}`)
    .append("circle")
    .attr("r", NOTE_HIT_RADIUS)
    .attr("fill", "transparent");
  node.filter((d) => d.type === "project").attr("aria-hidden", "true");
  const circle = node
    .append("circle")
    .attr("r", (d) => (d.type === "project" ? PROJECT_RADIUS : NOTE_RADIUS));

  const label = labelLayer
    .selectAll("text")
    .data(nodes.filter((n) => n.type === "note"), (d) => d.id)
    .join("text")
    .text((d) => truncate(d.title, LABEL_LIMIT))
    .attr("text-anchor", "middle")
    .style("font-family", "var(--font-body)")
    .style("font-size", "var(--text-xs)")
    .style("paint-order", "stroke")
    .style("stroke-width", "3px")
    .style("stroke-linejoin", "round")
    .style("user-select", "none");

  const touchesActive = (l) => activeId !== null && (l.source.id === activeId || l.target.id === activeId);
  const isNear = (d) => activeId === null || d.id === activeId || neighbors.get(activeId)?.has(d.id);
  const fillOf = (d) => {
    if (d.type === "project") return colors.project;
    return d.id === activeId ? colors.noteActive : colors.note;
  };

  const paint = () => {
    dot.attr("fill", colors.dot);
    link
      .attr("stroke", (l) => {
        if (activeId === null) return colors.link;
        return touchesActive(l) ? colors.linkActive : colors.linkMuted;
      })
      .attr("stroke-width", (l) => (touchesActive(l) ? 1.5 : 1));
    circle.attr("fill", fillOf).attr("opacity", (d) => (isNear(d) ? 1 : 0.2));
    label
      .attr("fill", colors.label)
      .attr("stroke", colors.labelHalo)
      .attr("opacity", (d) => (d.id === activeId ? 1 : 0));
  };

  const placeLabels = () => {
    label.attr("x", (d) => view.applyX(d.x)).attr("y", (d) => view.applyY(d.y) - LABEL_GAP_PX);
  };

  const ticked = () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    placeLabels();
  };

  const setActive = (id) => {
    activeId = id;
    paint();
  };
  const openNote = (d) => {
    if (d.type === "note") onOpenNote?.(d.id);
  };

  node
    .call(makeDrag(sim))
    .on("click", (event, d) => openNote(d))
    .on("keydown", (event, d) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openNote(d);
    })
    .on("mouseenter focus", (event, d) => setActive(d.id))
    .on("mouseleave blur", () => setActive(null));

  svg.call(
    zoom()
      .scaleExtent(ZOOM_EXTENT)
      .filter(zoomFilter)
      .on("zoom", (event) => {
        view = event.transform;
        world.attr("transform", view);
        placeLabels();
      })
  );

  sim.on("tick", ticked);
  paint();
  if (reduceMotion) {
    sim.stop();
    sim.tick(SETTLE_TICKS);
    ticked();
  }

  return {
    refreshColors: () => {
      colors = readGraphColors();
      paint();
    },
    // Soft center gravity follows the container, so a resize recenters without a rebuild.
    resize: (w, h) => {
      sim.force("cx").x(w / 2);
      sim.force("cy").y(h / 2);
      sim.alpha(RESIZE_ALPHA);
      if (reduceMotion) {
        sim.tick(RESIZE_TICKS);
        ticked();
      } else {
        sim.restart();
      }
    },
    destroy: () => {
      sim.stop();
      svg.on(".zoom", null);
      svg.selectAll("*").remove();
    },
  };
};

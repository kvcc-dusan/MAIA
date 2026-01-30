import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} [fx]
 * @property {number} [fy]
 * @property {string} type - 'note' | 'project'
 * @property {number} val
 * @property {string} color
 * @property {string} title
 */

/**
 * @typedef {Object} GraphLink
 * @property {GraphNode} source
 * @property {GraphNode} target
 */

/**
 * Custom hook to manage D3 Force Simulation
 * @param {Object} params
 * @param {GraphNode[]} params.nodes
 * @param {GraphLink[]} params.links
 * @param {{w: number, h: number}} params.dims
 * @param {Object} [params.options]
 * @param {Function} [params.onNodeClick]
 * @param {Function} [params.onNodeHover]
 * @param {Function} [params.onNodeOut]
 * @returns {React.RefObject<SVGSVGElement>}
 */
const THEME = {
  link: "#27272a", // zinc-800
  nodeFill: "#e4e4e7",
};

export function useGraphSimulation({
  nodes,
  links,
  dims,
  onNodeClick,
  onNodeHover,
  onNodeOut,
}) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // Use refs for callbacks to avoid re-running effect on callback change
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onNodeOutRef = useRef(onNodeOut);

  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeHoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { onNodeOutRef.current = onNodeOut; }, [onNodeOut]);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = dims.w;
    const height = dims.h;

    // Select SVG
    const svg = d3.select(svgRef.current);

    // Clear previous render
    svg.selectAll("*").remove();

    // Create container group for Zoom
    const g = svg.append("g");
    const linkLayer = g.append("g").attr("class", "links");
    const nodeLayer = g.append("g").attr("class", "nodes");
    const labelLayer = g.append("g").attr("class", "labels");

    // Initialize Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(0.2))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => 15 + d.val).strength(0.8));

    simulationRef.current = simulation;

    // --- Render Elements ---

    // Links
    const link = linkLayer.selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", THEME.link)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("class", "link");

    // Drag Behavior
    const drag = (sim) => {
      function dragstarted(event) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    // Nodes
    const node = nodeLayer.selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.type === "project" ? 10 : (6 + Math.sqrt(d.val * 3)))
      .attr("fill", d => d.type === "project" ? d.color : THEME.nodeFill)
      .attr("stroke", "none")
      .attr("stroke-width", 0)
      .style("cursor", "pointer")
      .attr("class", "node")
      .call(drag(simulation));

    // Labels
    const label = labelLayer.selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.title)
      .attr("font-size", d => 10 + d.val)
      .attr("fill", "#a1a1aa") // zinc-400
      .attr("text-anchor", "middle")
      .attr("dy", d => 28 + d.val)
      .attr("opacity", 0.7)
      .style("pointer-events", "none")
      .style("transition", "opacity 0.2s")
      .attr("class", "label");

    // --- Interactions ---

    // We attach listeners that proxy to the refs
    node.on("click", (e, d) => {
        if (onNodeClickRef.current) {
            e.stopPropagation();
            onNodeClickRef.current(d, e);
        }
    });

    node
    .on("mouseover", (e, d) => {
        if (onNodeHoverRef.current) {
            onNodeHoverRef.current(d, { link, node, label });
        }
    })
    .on("mouseout", (e, d) => {
        if (onNodeOutRef.current) {
            onNodeOutRef.current(d, { link, node, label });
        }
    });

    // --- Simulation Tick ---
    simulation.on("tick", () => {
      link.attr("d", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
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

    // --- Zoom ---
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        const k = event.transform.k;
        label.attr("opacity", d => {
          if (k > 1.5) return 1;
          if (k < 0.7 && d.val < 2) return 0.1;
          return 0.5;
        });
      });

    svg.call(zoom);

    // Initial Zoom Fit
    const initialTransform = setTimeout(() => {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2)
      );
    }, 100);

    return () => {
      simulation.stop();
      clearTimeout(initialTransform);
    };

  }, [nodes, links, dims.w, dims.h]); // Re-run if data or dims change

  return svgRef;
}

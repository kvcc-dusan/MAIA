// @maia:graph-renderer
import React, { useEffect, useRef } from "react";
import { select, drag, zoom, zoomIdentity } from "d3";
import { dottedBg } from "../../lib/theme.js";
import { useGraphSimulation } from "../../hooks/useGraphSimulation.js";

// Theme Constants
const COLORS = [
    "#2dd4bf", "#f472b6", "#fbbf24", "#818cf8", "#34d399", "#a78bfa",
];

const THEME = {
    bg: "#000000",
    nodeFill: "#e4e4e7",
    nodeActive: "#ffffff",
    nodeStroke: "none",
    link: "#27272a",
    text: "#a1a1aa",
    textActive: "#f4f4f5",
};

function GraphRenderer({
    nodes,
    links,
    dims,
    activeCluster,
    onOpenNote,
    nodeSize,
    linkThickness,
    fontSize,
    repelForce,
    linkDistance,
    searchQuery,
    setHoveredNode,
    wrapperRef,
    svgRef,
    zoomRef,
    nodesRef,
    searchRef
}) {

    const gRef = useRef(null);

    // Stable Refs for Callbacks to avoid effect re-runs (Performance Optimization)
    const onOpenNoteRef = useRef(onOpenNote);
    useEffect(() => { onOpenNoteRef.current = onOpenNote; }, [onOpenNote]);

    const setHoveredNodeRef = useRef(setHoveredNode);
    useEffect(() => { setHoveredNodeRef.current = setHoveredNode; }, [setHoveredNode]);

    // Use the custom simulation hook (Refactor)
    const simulation = useGraphSimulation({
        nodes,
        links,
        dims,
        repelForce,
        linkDistance
    });

    // --- D3 RENDER ---
    useEffect(() => {
        if (!svgRef.current || !simulation) return;

        // Measurements
        const width = dims.w;
        const height = dims.h;

        // Clean old
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();

        // Layers
        const g = svg.append("g");
        gRef.current = g;

        const linkLayer = g.append("g").attr("class", "links");
        const nodeLayer = g.append("g").attr("class", "nodes");
        const labelLayer = g.append("g").attr("class", "labels");

        // Update ref for Zoom access
        nodesRef.current = nodes;

        // Elements
        const link = linkLayer.selectAll("path")
            .data(links)
            .join("path")
            .attr("fill", "none")
            .attr("stroke", THEME.link)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", linkThickness)
            .attr("class", "link-element");

        const node = nodeLayer.selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", d => {
                const base = d.type === "project" ? 10 : (6 + Math.sqrt(d.val * 3));
                return base * nodeSize;
            })
            .attr("fill", d => d.type === "project" ? d.color : THEME.nodeFill)
            .attr("stroke", "none")
            .attr("stroke-width", 0)
            .style("cursor", "pointer")
            .attr("class", "node-element")
            .call(createDrag(simulation));

        const label = labelLayer.selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.title)
            .attr("font-size", d => (10 + d.val) * fontSize)
            .attr("fill", THEME.text)
            .attr("text-anchor", "middle")
            .attr("dy", d => 28 + d.val)
            .attr("opacity", 0.7)
            .style("pointer-events", "none")
            .style("transition", "opacity 0.2s")
            .attr("class", "label-element");


        // Interactions using Stable Refs
        node
            .on("click", (e, d) => {
                const cb = onOpenNoteRef.current;
                if (d.type === "project") {
                    if (cb) cb(d.realId, "project");
                } else {
                    cb && cb(d.id);
                }
            })
            .on("mouseover", (e, d) => {
                setHoveredNodeRef.current?.(d);

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
                setHoveredNodeRef.current?.(null);

                const q = searchRef.current.toLowerCase().trim();
                const isSearchActive = q.length > 0;

                if (isSearchActive) {
                    node.attr("opacity", n => {
                        const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0.1;
                    });
                    node.attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
                    link.attr("stroke", THEME.link).attr("stroke-opacity", 0.1);
                    label.attr("opacity", n => {
                        const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0;
                    });
                } else {
                    link.attr("stroke", THEME.link).attr("stroke-opacity", 0.6).attr("opacity", 1);
                    node.attr("opacity", 1).attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
                    label.attr("opacity", d => (d.val > 2) ? 1 : 0);
                }
            });

        // Simulation Tick Linkage
        simulation.on("tick", () => {
            link.attr("d", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                if (dr === 0) return "";
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            label.attr("x", d => d.x).attr("y", d => d.y);
        });

        // Zoom Behavior
        const zoomBehavior = zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                const k = event.transform.k;
                label.attr("opacity", d => {
                    if (searchRef.current) {
                        const q = searchRef.current.toLowerCase();
                        const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0;
                    }
                    if (k > 1.5) return 1;
                    if (k < 0.7 && d.val < 2) return 0.1;
                    return 0.5;
                });
            });

        zoomRef.current = zoomBehavior;
        svg.call(zoomBehavior);

        setTimeout(() => {
            svg.transition().duration(750).call(
                zoomBehavior.transform,
                zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2)
            );
        }, 500);

        return () => {
            // Detach listener
            simulation.on("tick", null);
        };
    }, [simulation, nodes, links, dims, nodeSize, linkThickness, fontSize, repelForce, linkDistance, nodesRef, searchRef, svgRef, zoomRef]); // Removed callback deps (onOpenNote, etc)

    // --- SEARCH EFFECT ---
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        const node = svg.selectAll(".node-element");
        const label = svg.selectAll(".label-element");
        const link = svg.selectAll(".link-element");
        const q = searchQuery.toLowerCase().trim();

        if (q) {
            node.style("opacity", d => {
                const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
                return match ? 1 : 0.1;
            });
            link.style("opacity", 0.1);
            label.style("opacity", d => {
                const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
                return match ? 1 : 0;
            });
        } else {
            node.style("opacity", 1).style("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
            link.style("opacity", 1).attr("stroke-opacity", 0.6);
            label.style("opacity", d => (activeCluster !== null && activeCluster !== undefined) ? (d.group === activeCluster ? 1 : 0) : (d.val > 2 ? 1 : 0.5));
        }
    }, [searchQuery, activeCluster, nodes, svgRef]);


    function createDrag(simulation) {
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
        return drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }

    return (
        <div className="relative w-full h-full bg-black overflow-hidden" ref={wrapperRef}>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={dottedBg} />
            <svg ref={svgRef} className="w-full h-full block" />
        </div>
    );
}

export default React.memo(GraphRenderer);

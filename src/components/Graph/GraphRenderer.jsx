// @maia:graph-renderer
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { dottedBg } from "../../lib/theme.js";

// Theme Constants (Should be shared, but copying for now for isolation)
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

export default function GraphRenderer({
    nodes,
    links,
    dims,
    activeCluster,
    showSignals,
    onOpenNote,
    nodeSize,
    linkThickness,
    fontSize,
    repelForce,
    linkDistance,
    searchQuery,
    setHoveredNode,
    wrapperRef, // Optional if we want resizing handled inside or outside
    svgRef,     // Passed from parent to allow imperative handleZoomToNode if needed, or we keep zoom logic here
    zoomRef,    // passed ref
    nodesRef,   // passed ref
    searchRef   // passed ref
}) {

    const gRef = useRef(null); // Store the main group for zooming

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
        gRef.current = g; // Store for zoom

        const linkLayer = g.append("g").attr("class", "links");
        const nodeLayer = g.append("g").attr("class", "nodes");
        const labelLayer = g.append("g").attr("class", "labels");

        // Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(linkDistance).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-repelForce))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => 15 + d.val).strength(0.8));

        // Re-heat simulation on init to ensure layout settles
        simulation.alpha(1).restart();

        // Update ref for Zoom access
        nodesRef.current = nodes;

        // Elements
        // Use paths for curved 'elastic' links
        const link = linkLayer.selectAll("path")
            .data(links)
            .join("path")
            .attr("fill", "none")
            .attr("stroke", THEME.link)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => linkThickness)
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
            .call(drag(simulation));

        const label = labelLayer.selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.title)
            .attr("font-size", d => (10 + d.val) * fontSize)
            .attr("fill", THEME.text)
            .attr("text-anchor", "middle") // Center text horizontally
            .attr("dy", d => 28 + d.val) // Position below the node with more gap
            .attr("opacity", 0.7) // Default visible but slightly transparent
            .style("pointer-events", "none")
            .style("transition", "opacity 0.2s")
            .attr("class", "label-element");


        // Interactions
        node
            .on("click", (e, d) => {
                if (d.type === "project") {
                    if (onOpenNote) onOpenNote(d.realId, "project");
                } else {
                    onOpenNote && onOpenNote(d.id);
                }
            })
            .on("mouseover", (e, d) => {
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
            })
            .on("mouseout", () => {
                setHoveredNode(null);

                const q = searchRef.current.toLowerCase().trim();
                const isSearchActive = q.length > 0;

                if (isSearchActive) {
                    // Return to Search State
                    node.attr("opacity", n => {
                        const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0.1;
                    });

                    // Ensure project color is preserved
                    node.attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);

                    link.attr("stroke", THEME.link).attr("stroke-opacity", 0.1); // Dim links during search
                    label.attr("opacity", n => {
                        const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0;
                    });

                } else {
                    // Return to Default State
                    link.attr("stroke", THEME.link).attr("stroke-opacity", 0.6).attr("opacity", 1);
                    node.attr("opacity", 1).attr("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
                    label.attr("opacity", d => (d.val > 2 || activeCluster === d.group) ? 1 : 0);
                }
            });

        // Simulation Tick
        simulation.on("tick", () => {
            link.attr("d", d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Multiplier flattens the curve slightly
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

        // Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                // Semantic Zoom: Scale label opacity/size based on zoom level (k)
                const k = event.transform.k;
                label.attr("opacity", d => {
                    // If searching, let search logic handle opacity unless we want semantic zoom on top
                    if (searchRef.current) {
                        const q = searchRef.current.toLowerCase();
                        const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
                        return match ? 1 : 0;
                    }

                    if (k > 1.5) return 1;
                    // Fainter when zoomed out
                    if (k < 0.7 && d.val < 2) return 0.1;
                    return 0.5;
                });
            });

        zoomRef.current = zoom; // Store for external access
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
    }, [nodes, links, dims, showSignals, activeCluster, onOpenNote, nodeSize, linkThickness, fontSize, repelForce, linkDistance, nodesRef, searchRef, setHoveredNode, svgRef, zoomRef]);

    // --- SEARCH VISUAL EFFECT ---
    // Handle "Dimming" and "Highlighting" without restarting simulation
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const node = svg.selectAll(".node-element");
        const label = svg.selectAll(".label-element");
        const link = svg.selectAll(".link-element");

        const q = searchQuery.toLowerCase().trim();

        if (!q) {
            // Reset to default
            node.style("opacity", 1).style("fill", n => n.type === "project" ? n.color : THEME.nodeFill);
            link.style("opacity", 1).attr("stroke-opacity", 0.6);
            label.style("opacity", 0.7);
            return;
        }

        // Apply Search Dimming
        node.style("opacity", d => {
            const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
            return match ? 1 : 0.1;
        });

        link.style("opacity", 0.1); // Dim links

        label.style("opacity", d => {
            const match = (d.title || "").toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
            return match ? 1 : 0;
        });

    }, [searchQuery, nodes, svgRef]);


    // Helper Functions
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

    return (
        <div className="relative w-full h-full bg-black overflow-hidden" ref={wrapperRef}>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={dottedBg} />
            <svg ref={svgRef} className="w-full h-full block" />
        </div>
    );
}

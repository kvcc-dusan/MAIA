// @maia:graph-renderer
import React, { useEffect, useRef } from "react";
import { select, drag, zoom, zoomIdentity } from "d3";
import { useGraphSimulation } from "../hooks/useGraphSimulation.js";
import styles from "./GraphRenderer.module.css";

// Colors arrive as the `theme` prop (graphTheme() from lib/tokens.js) and are
// read through a ref inside D3 handlers. A theme change repaints stroke/fill in
// place (see the recolor effect); it never touches the simulation or nodes.

// Fill is derived from node type, not stored on node data: node objects must
// stay stable across theme changes or the simulation resets positions.
const fillFor = (d, T) => (d.type === "project" ? T.text : T.nodeFill);

// graphTheme().link (--border-strong) is 1.7:1 on the light background and
// 2.3:1 on dark, under the 3:1 non-text minimum. Links use the muted text
// token instead (4.1:1 light, 6.3:1 dark); labels use the secondary text token.
const linkColor = (T) => T.text;
const labelColor = (T) => T.nodeFill;

function GraphRenderer({
    nodes,
    links,
    dims,
    theme,
    activeCluster,
    onOpenNote,
    nodeSize,
    linkThickness,
    fontSize,
    repelForce,
    linkDistance,
    query = "",
    setHoveredNode,
    wrapperRef,
    svgRef,
    zoomRef,
    nodesRef,
    searchRef
}) {
    const gRef = useRef(null);
    const initialZoomDone = useRef(false);

    const themeRef = useRef(theme);

    // Stable Refs for Callbacks
    const onOpenNoteRef = useRef(onOpenNote);
    useEffect(() => { onOpenNoteRef.current = onOpenNote; }, [onOpenNote]);

    const setHoveredNodeRef = useRef(setHoveredNode);
    useEffect(() => { setHoveredNodeRef.current = setHoveredNode; }, [setHoveredNode]);

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

        const width = dims.w;
        const height = dims.h;
        const svg = select(svgRef.current);

        // Initialize layers only once
        if (!gRef.current) {
            const g = svg.append("g");
            gRef.current = g;
            g.append("g").attr("class", "links");
            g.append("g").attr("class", "nodes");
            g.append("g").attr("class", "labels");

        }

        const g = gRef.current;

        // The page renders the empty state; the canvas just hides its layers.
        if (!nodes || nodes.length === 0) {
            g.style("opacity", 0);
            return;
        }
        g.style("opacity", 1);

        const linkLayer = g.select(".links");
        const nodeLayer = g.select(".nodes");
        const labelLayer = g.select(".labels");

        nodesRef.current = nodes;

        // JOIN pattern for efficient updates
        const link = linkLayer.selectAll("path")
            .data(links, d => d.id) // Use key function for stability
            .join("path")
            .attr("fill", "none")
            .attr("stroke", linkColor(themeRef.current))
            .attr("stroke-opacity", 1)
            .attr("stroke-width", linkThickness)
            .attr("class", "link-element");

        const node = nodeLayer.selectAll("circle")
            .data(nodes, d => d.id)
            .join("circle")
            .attr("r", d => {
                const base = d.type === "project" ? 10 : (6 + Math.sqrt(d.val * 3));
                return base * nodeSize;
            })
            .attr("fill", d => fillFor(d, themeRef.current))
            .attr("stroke", "none")
            .attr("stroke-width", 0)
            .style("cursor", "pointer")
            .attr("class", "node-element")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", d => `Open ${d.title}`)
            .call(createDrag(simulation));

        const label = labelLayer.selectAll("text")
            .data(nodes, d => d.id)
            .join("text")
            .text(d => d.title)
            .attr("font-size", d => (12 + d.val) * fontSize)
            .attr("fill", labelColor(themeRef.current))
            .attr("text-anchor", "middle")
            .attr("dy", d => 28 + d.val)
            .attr("opacity", 1)
            .style("pointer-events", "none")
            .style("transition", "opacity 0.2s")
            .attr("class", "label-element")
            .style("font-family", "var(--font-body)");

        // Hover and keyboard focus share one highlight.
        const highlight = (d) => {
            setHoveredNodeRef.current?.(d);
            link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? themeRef.current.nodeActive : linkColor(themeRef.current))
                .attr("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);

            node.attr("opacity", n => {
                const isConnected = links.some(l =>
                    (l.source.id === d.id && l.target.id === n.id) ||
                    (l.target.id === d.id && l.source.id === n.id)
                );
                return (n.id === d.id || isConnected) ? 1 : 0.1;
            }).attr("fill", n => {
                if (n.id === d.id) return themeRef.current.nodeActive;
                return fillFor(n, themeRef.current);
            });
            label.attr("opacity", n => (n.id === d.id) ? 1 : 0);
        };

        // Interactions
        node
            .on("click", (e, d) => {
                const cb = onOpenNoteRef.current;
                if (d.type === "project") {
                    if (cb) cb(d.realId, "project");
                } else {
                    cb && cb(d.id);
                }
            })
            .on("keydown", (e, d) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                const cb = onOpenNoteRef.current;
                if (d.type === "project") cb?.(d.realId, "project");
                else cb?.(d.id);
            })
            .on("focus", (e, d) => highlight(d))
            .on("blur", () => {
                setHoveredNodeRef.current?.(null);
                updateSearchStyle();
            })
            .on("mouseover", (e, d) => highlight(d))
            .on("mouseout", () => {
                setHoveredNodeRef.current?.(null);
                updateSearchStyle(); // Restore search or default style
            });

        // Shared style update logic
        const updateSearchStyle = () => {
            const q = searchRef.current ? searchRef.current.toLowerCase().trim() : "";
            const isSearchActive = q.length > 0;

            if (isSearchActive) {
                node.attr("opacity", n => {
                    const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                    return match ? 1 : 0.1;
                });
                node.attr("fill", n => fillFor(n, themeRef.current));
                link.attr("stroke", linkColor(themeRef.current)).attr("stroke-opacity", 0.1);
                label.attr("opacity", n => {
                    const match = (n.title || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q));
                    return match ? 1 : 0;
                });
            } else {
                link.attr("stroke", linkColor(themeRef.current)).attr("stroke-opacity", 1).attr("opacity", 1);
                node.attr("opacity", 1).attr("fill", n => fillFor(n, themeRef.current));
                label.attr("opacity", 1); // Reset to default opacity
            }
        };

        // Run immediately to apply initial/search styles
        updateSearchStyle();

        // Simulation Tick
        simulation.on("tick", () => {
            link.attr("d", d => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
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
                    if (k > 0.8) return 1;
                    if (k < 0.25) return 0;
                    if (d.val > 2) return 1;
                    return 1;
                });
            });

        zoomRef.current = zoomBehavior;
        svg.call(zoomBehavior);

        // Initial Zoom only once
        if (!initialZoomDone.current) {
            setTimeout(() => {
                svg.transition().duration(750).call(
                    zoomBehavior.transform,
                    zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2)
                );
            }, 500);
            initialZoomDone.current = true;
        }

        return () => {
            simulation.on("tick", null);
        };
    }, [simulation, nodes, links, dims, nodesRef, searchRef, svgRef, zoomRef]);

    // --- THEME CHANGE: repaint in place ---
    // Only attributes change, so node positions and zoom survive a theme switch.
    useEffect(() => {
        themeRef.current = theme;
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        svg.selectAll(".link-element").attr("stroke", linkColor(theme));
        svg.selectAll(".node-element").attr("fill", d => fillFor(d, theme));
        svg.selectAll(".label-element").attr("fill", labelColor(theme));
    }, [theme, svgRef]);

    // --- VISUAL UPDATES (No Re-render) ---
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        svg.selectAll(".node-element")
            .transition().duration(300)
            .attr("r", d => {
                const base = d.type === "project" ? 10 : (6 + Math.sqrt(d.val * 3));
                return base * nodeSize;
            });

        svg.selectAll(".link-element")
            .transition().duration(300)
            .attr("stroke-width", linkThickness);

        svg.selectAll(".label-element")
            .transition().duration(300)
            .attr("font-size", d => (12 + d.val) * fontSize);

    }, [nodeSize, linkThickness, fontSize, svgRef]);

    // --- SEARCH EFFECT ---
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        const node = svg.selectAll(".node-element");
        const label = svg.selectAll(".label-element");
        const link = svg.selectAll(".link-element");
        const qStr = (query || "").toLowerCase().trim();

        if (qStr) {
            node.attr("opacity", d => {
                const match = (d.title || "").toLowerCase().includes(qStr) || (d.tags || []).some(t => t.toLowerCase().includes(qStr));
                return match ? 1 : 0.1;
            });
            link.attr("opacity", 0.1);
            label.attr("opacity", d => {
                const match = (d.title || "").toLowerCase().includes(qStr) || (d.tags || []).some(t => t.toLowerCase().includes(qStr));
                return match ? 1 : 0;
            });
        } else {
            // attr, not style: an inline opacity would beat the hover highlight's attr.
            node.attr("opacity", 1).attr("fill", n => fillFor(n, themeRef.current));
            link.attr("opacity", 1).attr("stroke-opacity", 1);
            label.attr("opacity", d => (activeCluster !== null && activeCluster !== undefined) ? (d.group === activeCluster ? 1 : 0) : 1);
        }
    }, [query, activeCluster, nodes, svgRef]);


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
        <div className={styles.canvas} ref={wrapperRef}>
            <svg ref={svgRef} className={styles.svg} aria-label="Knowledge graph of notes and projects" />
        </div>
    );
}

export default React.memo(GraphRenderer);

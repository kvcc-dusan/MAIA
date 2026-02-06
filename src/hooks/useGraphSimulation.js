import { useEffect, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3';

/**
 * Custom hook to run a D3 force simulation for a graph.
 *
 * @param {Object} params
 * @param {Array} params.nodes - List of node objects.
 * @param {Array} params.links - List of link objects.
 * @param {{w: number, h: number}} params.dims - Dimensions of the simulation area.
 * @param {number} params.repelForce - Strength of the charge force (repulsion).
 * @param {number} params.linkDistance - Desired distance between linked nodes.
 * @returns {Object} - The D3 simulation instance.
 */
export function useGraphSimulation({
    nodes,
    links,
    dims,
    repelForce,
    linkDistance,
}) {
    // Create a stable simulation instance
    const simulation = useMemo(() => forceSimulation(), []);

    useEffect(() => {
        // Measurements
        const width = dims.w;
        const height = dims.h;

        // Configure simulation
        simulation.nodes(nodes);

        simulation
            .force("link", forceLink(links).id(d => d.id).distance(linkDistance).strength(0.5))
            .force("charge", forceManyBody().strength(-repelForce))
            .force("center", forceCenter(width / 2, height / 2))
            .force("collide", forceCollide().radius(d => 15 + d.val).strength(0.8));

        // Re-heat simulation to ensure layout settles
        simulation.alpha(1).restart();

        return () => simulation.stop();
    }, [nodes, links, dims, repelForce, linkDistance, simulation]);

    return simulation;
}

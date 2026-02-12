import { useEffect, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceX, forceY, forceCollide } from 'd3';

/**
 * Custom hook to run a D3 force simulation for a graph.
 *
 * Uses forceX/forceY instead of forceCenter so gravity strength is adjustable.
 * This enables the "Entropy" slider to both expand AND contract the graph.
 */
export function useGraphSimulation({
    nodes,
    links,
    dims,
    repelForce,
    linkDistance,
}) {
    const simulation = useMemo(() => forceSimulation(), []);

    // 1. Initial Setup & Data Updates
    useEffect(() => {
        const cx = dims.w / 2;
        const cy = dims.h / 2;

        simulation.nodes(nodes);

        // Entropy → Gravity mapping
        const normalizedEntropy = Math.min(1, Math.max(0, repelForce / 800));
        const gravityStrength = 0.05 + (1 - normalizedEntropy) * 0.95;

        // Entanglement → reversed link distance
        const reversedDistance = Math.max(10, 500 - linkDistance);

        simulation
            .force("link", forceLink(links).id(d => d.id).distance(reversedDistance).strength(0.5))
            .force("charge", forceManyBody().strength(-repelForce))
            .force("gravityX", forceX(cx).strength(gravityStrength))
            .force("gravityY", forceY(cy).strength(gravityStrength))
            .force("collide", forceCollide().radius(d => 15 + d.val).strength(0.8));

        simulation.alpha(1).restart();

        return () => simulation.stop();
    }, [simulation, nodes, links, dims]);

    // 2. Update Physics Parameters (Dynamic)
    useEffect(() => {
        const cx = dims.w / 2;
        const cy = dims.h / 2;

        // Entanglement: High slider → short distance (closer)
        const reversedDistance = Math.max(10, 500 - linkDistance);

        // Entropy → Gravity (inverse relationship)
        const normalizedEntropy = Math.min(1, Math.max(0, repelForce / 800));
        const gravityStrength = 0.05 + (1 - normalizedEntropy) * 0.95;

        // Apply forces
        simulation.force("charge")?.strength(-repelForce);
        simulation.force("gravityX")?.x(cx).strength(gravityStrength);
        simulation.force("gravityY")?.y(cy).strength(gravityStrength);
        simulation.force("link")?.distance(reversedDistance);

        // Re-heat — use higher alpha so contraction is visible
        simulation.alpha(0.5).alphaTarget(0).restart();
    }, [simulation, repelForce, linkDistance, dims]);

    return simulation;
}

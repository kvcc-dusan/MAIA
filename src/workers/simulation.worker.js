import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3";

/**
 * Web Worker for D3 Force Simulation
 * Handles physics calculations off the main thread.
 */

let simulation;
let nodes = [];
let links = [];

// Default parameters
let currentParams = {
    repelForce: 50,
    linkDistance: 50,
    collideRadius: 15, // Base radius
    width: 800,
    height: 600
};

self.onmessage = (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case "init":
            initializeSimulation(payload);
            break;
        case "update_params":
            updateParams(payload);
            break;
        case "update_dims":
            updateDims(payload);
            break;
        case "drag":
            handleDrag(payload);
            break;
        case "stop":
            if (simulation) simulation.stop();
            break;
        case "start":
            if (simulation) simulation.restart();
            break;
        default:
            console.warn("Unknown message type in simulation worker:", type);
    }
};

function initializeSimulation({ nodes: newNodes, links: newLinks, dims, options }) {
    nodes = newNodes;
    links = newLinks;

    if (dims) {
        currentParams.width = dims.w;
        currentParams.height = dims.h;
    }

    if (options) {
        currentParams = { ...currentParams, ...options };
    }

    if (simulation) simulation.stop();

    simulation = forceSimulation(nodes)
        .force("link", forceLink(links).id(d => d.id).distance(currentParams.linkDistance).strength(0.5))
        .force("charge", forceManyBody().strength(-currentParams.repelForce))
        .force("center", forceCenter(currentParams.width / 2, currentParams.height / 2))
        .force("collide", forceCollide().radius(d => currentParams.collideRadius + (d.val || 0)).strength(0.8));

    simulation.on("tick", () => {
        // Send back minimal data needed for rendering
        // We send the whole nodes array because d3 modifies it in place with x, y, vx, vy
        // For links, source/target are now object references in 'links', which might be circular.
        // However, the renderer usually only needs node positions to draw links.
        // If the renderer uses links[i].source.x, that works if links are updated.
        // But we can't send circular structures easily without structuredClone (which postMessage uses).
        // To be safe and efficient, we can just send nodes.
        // The main thread links likely still point to the main thread's node objects.
        // So the main thread needs to update ITS node objects with these new x/y coordinates.

        self.postMessage({
            type: "tick",
            nodes: nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
            // We map to simple objects to avoid sending too much data and ensure easy merging on main thread.
            // If the main thread needs to update links, it should do so based on these new node positions.
        });
    });

    // Re-heat simulation on init
    simulation.alpha(1).restart();
}

function updateParams(options) {
    if (!simulation) return;

    currentParams = { ...currentParams, ...options };

    if (options.repelForce !== undefined) {
        simulation.force("charge", forceManyBody().strength(-currentParams.repelForce));
    }

    if (options.linkDistance !== undefined) {
        simulation.force("link").distance(currentParams.linkDistance);
    }

    // Restart alpha to settle new forces
    simulation.alpha(0.3).restart();
}

function updateDims({ w, h }) {
    if (!simulation) return;
    currentParams.width = w;
    currentParams.height = h;
    simulation.force("center", forceCenter(w / 2, h / 2));
    simulation.alpha(0.3).restart();
}

function handleDrag({ id, fx, fy }) {
    if (!simulation) return;

    const node = nodes.find(n => n.id === id);
    if (node) {
        node.fx = fx;
        node.fy = fy;
        simulation.alphaTarget(0.3).restart();
    }

    // If fx/fy are null (drag end), reset alphaTarget
    if (fx === null && fy === null) {
        simulation.alphaTarget(0);
    }
}

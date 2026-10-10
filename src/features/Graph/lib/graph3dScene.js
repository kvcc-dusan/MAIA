// Imperative wrapper around 3d-force-graph. The React component creates one
// scene per mount and talks to it through this small API, so props changing
// never recreates the WebGL context. Everything three.js owns is released in
// destroy().
import ForceGraph3D from "3d-force-graph";
import { intToHex, intToHexAlpha, mixInts } from "./colorConvert.js";
import {
  DIM_OPACITY, boundingSphere, buildAdjacency, computeFocus, fitDistance, flyTarget, isLit, linkRotation, nodeRadius, qualityTier,
} from "./graphData3d.js";
import { chargeFor, createGravityForce, gravityFor, linkDistanceFor, linkWidthFor } from "./graphForces.js";
import {
  createNodeParts, createSharedAssets, disposeParts, ensureLabel, pulseRing, resizeLabel, stylePart,
} from "./nodeObjects3d.js";

const LINK_CURVATURE = 0.2;
const LINK_ALPHA = { base: 0.5, bright: 0.95, lit: 0.5, dim: 0.04 };
const GLOW_OPACITY = 0.85;
const HOVER_SCALE = 1.3;
const LABEL_NEAR = 80;
const LABEL_FAR = 280;
const LABEL_INTERVAL_MS = 120;
const DOUBLE_CLICK_MS = 350;
const FLY_MS = 900;
const FIT_MS = 700;
const FOCUS_DISTANCE = 60;
const AUTO_ROTATE_SPEED = 0.45;
const SETTLE_FIT_DELAY_MS = 350;

const endId = (end) => (end !== null && typeof end === "object" ? end.id : end);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @param {object} options
 * @param {HTMLElement} options.container element the canvas is added to
 * @param {boolean} options.reducedMotion no auto-rotation, no pulse, instant camera moves
 * @param {(node: object|null) => void} options.onHover
 * @param {(node: object) => void} options.onNodeClick
 * @param {() => void} options.onContextLost
 * @throws when WebGL is unavailable (the renderer constructor throws)
 */
export const createGraphScene = ({ container, reducedMotion, onHover, onNodeClick, onContextLost }) => {
  const graph = new ForceGraph3D(container, {
    controlType: "orbit",
    rendererConfig: { antialias: true, powerPreference: "high-performance" },
  });

  const s = {
    style: null,
    nodes: [],
    nodeById: new Map(),
    adjacency: new Map(),
    parts: new Map(),
    tier: qualityTier(0),
    assets: createSharedAssets(qualityTier(0).sphereSegments),
    gravity: createGravityForce(0),
    focus: computeFocus({ hoverId: null, adjacency: new Map(), matchIds: null, clusterIds: null }),
    hoverId: null,
    matchIds: null,
    clusterIds: null,
    labelCount: 0,
    paused: false,
    destroyed: false,
    interacted: false,
    fitted: false,
    lastBgClick: 0,
    lastLabelPass: 0,
    raf: 0,
    fitTimer: 0,
    forceKey: "",
    widthKey: null,
  };

  const colorOf = (node) => {
    const { colors, groupOf, neutral } = s.style;
    return colors.get(groupOf.get(node.id)) ?? neutral;
  };

  // --- node styling -------------------------------------------------------

  const styleOne = (parts) => {
    const { style, focus, tier } = s;
    const lit = isLit(focus, parts.node.id);
    const hovered = focus.hoverId === parts.node.id;
    stylePart(parts, {
      radius: nodeRadius(parts.node, parts.node.degree, style.nodeSize) * (hovered ? HOVER_SCALE : 1),
      color: colorOf(parts.node),
      opacity: lit ? 1 : DIM_OPACITY,
      // Additive glow vanishes on a light background, so it is dark theme only.
      glow: tier.glow && style.isDark,
      glowOpacity: GLOW_OPACITY,
    });
    resizeLabel(parts, style.fontSize);
  };

  const styleAll = () => {
    if (!s.style) return;
    s.parts.forEach(styleOne);
  };

  const linkColor = (link) => {
    const a = endId(link.source);
    const b = endId(link.target);
    const node = s.nodeById.get(a);
    const base = node ? colorOf(node) : s.style.neutral;
    const { focus } = s;
    if (focus.lit === null) return intToHexAlpha(base, LINK_ALPHA.base);
    const touches = focus.kind === "hover" ? a === focus.hoverId || b === focus.hoverId : focus.lit.has(a) && focus.lit.has(b);
    if (!touches) return intToHexAlpha(base, LINK_ALPHA.dim);
    if (focus.kind === "hover") return intToHexAlpha(mixInts(base, s.style.fgInt, 0.4), LINK_ALPHA.bright);
    return intToHexAlpha(base, LINK_ALPHA.lit);
  };

  // A fresh function each time: the library only re-reads the accessor on change.
  const refreshLinks = () => graph.linkColor((link) => linkColor(link));

  const applyFocus = () => {
    s.focus = computeFocus({
      hoverId: s.hoverId, adjacency: s.adjacency, matchIds: s.matchIds, clusterIds: s.clusterIds,
    });
    styleAll();
    if (s.style) refreshLinks();
    updateLabels(true);
  };

  // --- labels and pulse (own loop, runs only while visible) ----------------

  function updateLabels(force = false) {
    if (!s.style) return;
    const now = performance.now();
    if (!force && now - s.lastLabelPass < LABEL_INTERVAL_MS) return;
    s.lastLabelPass = now;
    const cam = graph.camera().position;
    const { focus, style } = s;
    s.parts.forEach((parts) => {
      const n = parts.node;
      if (n.x === undefined) return;
      const emphasised = (focus.kind === "hover" || focus.kind === "search") && focus.lit.has(n.id);
      const hiddenByFocus = focus.lit !== null && !emphasised;
      // Hubs read from further away, so the overview still names the big nodes.
      const d = Math.hypot(cam.x - n.x, cam.y - n.y, cam.z - n.z) / (1 + n.degree * 0.06);
      const opacity = emphasised ? 1 : hiddenByFocus ? 0 : clamp01((LABEL_FAR - d) / (LABEL_FAR - LABEL_NEAR)) * 0.85;
      if (opacity < 0.04) {
        if (parts.label) parts.label.visible = false;
        return;
      }
      if (!parts.label) {
        if (s.labelCount >= s.tier.maxLabels) return;
        ensureLabel(parts, n.title, intToHex(style.textInt), style.fontFace, style.fontSize);
        s.labelCount += 1;
      }
      parts.label.visible = true;
      parts.label.material.opacity = opacity;
    });
  }

  const frame = (t) => {
    s.raf = 0;
    if (s.destroyed || s.paused) return;
    const pulse = reducedMotion ? 0.5 : (Math.sin(t / 450) + 1) / 2;
    s.parts.forEach((parts) => {
      if (parts.ring) pulseRing(parts, pulse);
    });
    updateLabels();
    s.raf = requestAnimationFrame(frame);
  };

  const startLoop = () => {
    if (!s.raf && !s.destroyed && !s.paused) s.raf = requestAnimationFrame(frame);
  };

  // --- camera -------------------------------------------------------------

  // zoomToFit frames the axis-aligned box, which leaves a round graph at about
// half the viewport; framing the bounding sphere uses the space better.
  const fit = (ms) => {
    const { center, radius } = boundingSphere(s.nodes);
    const camera = graph.camera();
    const target = graph.controls().target ?? center;
    const dir = { x: camera.position.x - target.x, y: camera.position.y - target.y, z: camera.position.z - target.z };
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const dist = fitDistance(radius, camera.fov, camera.aspect);
    graph.cameraPosition(
      { x: center.x + (dir.x / len) * dist, y: center.y + (dir.y / len) * dist, z: center.z + (dir.z / len) * dist },
      center,
      reducedMotion ? 0 : ms,
    );
  };

  const stopAutoRotate = () => {
    s.interacted = true;
    graph.controls().autoRotate = false;
  };

  const focusNode = (id) => {
    const node = s.nodeById.get(id);
    if (!node || node.x === undefined) return;
    const parts = s.parts.get(id);
    const distance = FOCUS_DISTANCE + (parts?.radius ?? 0) * 3;
    graph.cameraPosition(flyTarget(node, distance), node, reducedMotion ? 0 : FLY_MS);
  };

  // --- setup --------------------------------------------------------------

  graph
    .showNavInfo(false)
    .nodeLabel(() => "")
    .linkOpacity(1)
    .linkCurvature(LINK_CURVATURE)
    .linkCurveRotation(linkRotation)
    .linkDirectionalParticles(0)
    .nodeThreeObjectExtend(false)
    .warmupTicks(40)
    .cooldownTime(9000)
    .nodeThreeObject((node) => {
      const old = s.parts.get(node.id);
      if (old) disposeParts(old);
      const parts = createNodeParts(node, s.assets);
      s.parts.set(node.id, parts);
      if (s.style) styleOne(parts);
      return parts.group;
    })
    .onNodeHover((node) => {
      s.hoverId = node ? node.id : null;
      applyFocus();
      onHover(node || null);
    })
    .onNodeClick((node) => {
      stopAutoRotate();
      focusNode(node.id);
      onNodeClick(node);
    })
    .onBackgroundClick(() => {
      const now = performance.now();
      if (now - s.lastBgClick < DOUBLE_CLICK_MS) {
        stopAutoRotate();
        fit(FIT_MS);
      }
      s.lastBgClick = now;
    })
    .onEngineStop(() => {
      if (s.fitted || s.interacted || s.nodes.length === 0) return;
      s.fitted = true;
      fit(FIT_MS);
    });

  const controls = graph.controls();
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.addEventListener("start", stopAutoRotate);
  controls.listenToKeyEvents?.(container);

  const canvas = graph.renderer().domElement;
  const handleContextLost = (event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);
  startLoop();

  // --- public API ---------------------------------------------------------

  const applyForces = () => {
    const { repelForce, linkDistance } = s.style;
    const key = `${repelForce}|${linkDistance}`;
    if (key === s.forceKey) return;
    const first = s.forceKey === "";
    s.forceKey = key;
    graph.d3Force("charge")?.strength(chargeFor(repelForce));
    graph.d3Force("link")?.distance(linkDistanceFor(linkDistance));
    s.gravity.strength(gravityFor(repelForce));
    graph.d3Force("center", s.gravity);
    if (!first) graph.d3ReheatSimulation();
  };

  const applyWidth = () => {
    const width = linkWidthFor(s.style.linkThickness, s.tier.thinLinks);
    if (width === s.widthKey) return;
    s.widthKey = width;
    graph.linkWidth(width);
  };

  return {
    setStyle(style) {
      const themeChanged = !s.style || s.style.bgInt !== style.bgInt || s.style.textInt !== style.textInt;
      s.style = style;
      graph.backgroundColor(intToHex(style.bgInt));
      applyForces();
      applyWidth();
      styleAll();
      refreshLinks();
      if (themeChanged) {
        s.parts.forEach((parts) => {
          if (parts.label) parts.label.color = intToHex(style.textInt);
        });
      }
      s.parts.forEach((parts) => resizeLabel(parts, style.fontSize));
    },

    setData({ nodes, links }) {
      const tier = qualityTier(nodes.length, window.devicePixelRatio);
      const tierChanged = tier.heavy !== s.tier.heavy;
      s.tier = tier;
      s.nodes = nodes;
      s.nodeById = new Map(nodes.map((n) => [n.id, n]));
      s.adjacency = buildAdjacency(links);
      s.parts.forEach((parts, id) => {
        if (s.nodeById.get(id) === parts.node) return;
        if (parts.label) s.labelCount -= 1;
        disposeParts(parts);
        s.parts.delete(id);
      });
      if (s.hoverId && !s.nodeById.has(s.hoverId)) s.hoverId = null;
      graph.renderer().setPixelRatio(tier.pixelRatio);
      if (tierChanged) s.assets.setSegments(tier.sphereSegments);
      if (s.style) applyWidth();
      graph.graphData({ nodes, links });
      if (tierChanged) graph.refresh();
      s.focus = computeFocus({ hoverId: s.hoverId, adjacency: s.adjacency, matchIds: s.matchIds, clusterIds: s.clusterIds });
      if (!s.fitted && nodes.length > 0) {
        window.clearTimeout(s.fitTimer);
        s.fitTimer = window.setTimeout(() => {
          if (!s.interacted && !s.destroyed) fit(0);
        }, SETTLE_FIT_DELAY_MS);
      }
    },

    setHighlight({ matchIds, clusterIds }) {
      s.matchIds = matchIds;
      s.clusterIds = clusterIds;
      applyFocus();
    },

    setSize(width, height) {
      if (width <= 0 || height <= 0) return;
      graph.width(width).height(height);
    },

    setPaused(paused) {
      if (paused === s.paused || s.destroyed) return;
      s.paused = paused;
      if (paused) {
        graph.pauseAnimation();
        if (s.raf) cancelAnimationFrame(s.raf);
        s.raf = 0;
      } else {
        graph.resumeAnimation();
        startLoop();
      }
    },

    focusNode,
    resetCamera: () => {
      stopAutoRotate();
      fit(FIT_MS);
    },

    destroy() {
      if (s.destroyed) return;
      s.destroyed = true;
      cancelAnimationFrame(s.raf);
      window.clearTimeout(s.fitTimer);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      controls.removeEventListener("start", stopAutoRotate);
      controls.stopListenToKeyEvents?.();
      s.parts.forEach(disposeParts);
      s.parts.clear();
      s.assets.dispose();
      graph.renderer().forceContextLoss?.();
      graph._destructor();
      container.replaceChildren();
    },
  };
};

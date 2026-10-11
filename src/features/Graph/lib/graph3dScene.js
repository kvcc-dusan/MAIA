// Imperative wrapper around 3d-force-graph. The React component creates one
// scene per mount and talks to it through this small API, so props changing
// never recreates the WebGL context. Everything three.js owns is released in
// destroy().
import ForceGraph3D from "3d-force-graph";
import { Spherical, Vector3 } from "three";
import { intToHex, mixInts } from "./colorConvert.js";
import {
  DIM_OPACITY, boundingSphere, buildAdjacency, computeFocus, diffFocus, fitDistance, flyTarget, isLit, linkRotation, linkState,
  nodeRadius, qualityTier,
} from "./graphData3d.js";
import { chargeFor, createGravityForce, gravityFor, linkDistanceFor, linkWidthFor } from "./graphForces.js";
import { LABEL_PRIORITY, changedBeyond, estimateLabelSize, layoutLabels, stepToward } from "./labelLayout.js";
import { createLinkMaterials } from "./linkMaterials3d.js";
import {
  LABEL_TEXT_HEIGHT, createNodeParts, createSharedAssets, disposeParts, ensureLabel, labelOffset, pulseRing, releaseLabel, setDetail,
  repositionLabel, resizeLabel, setLabelColor, stylePart,
} from "./nodeObjects3d.js";

const LINK_CURVATURE = 0; // straight links
const LINK_ALPHA = { base: 0.5, bright: 0.95, lit: 0.5, dim: 0.04 };
const LINK_BRIGHT_MIX = 0.4;
const HOVER_SCALE = 1.3;
// Labels stay readable from far away: each one is sized from the camera distance so it keeps roughly the
// same size on screen, and a screen-space pass (labelLayout.js) decides which of them fit without overlapping.
const LABEL_SCREEN_RATIO = 0.011;
const LABEL_MAX_RATIO = 0.022;
const LABEL_INTERVAL_MS = 120;
const LABEL_OPACITY = 0.85;
const LABEL_FADE_MS = 160;
const LABEL_RESIZE_TOLERANCE = 0.05;
const LABEL_MAX_NEW_PER_PASS = 8; // building a SpriteText canvas is the expensive part
const LABEL_POOL_FACTOR = 2; // labels kept alive, relative to the visible cap
const LABEL_RELEASE_PER_PASS = 12;
const MAX_FRAME_DT_MS = 50;
const RETIRE_DELAY_MS = 1500;
const ALPHA_MIN = 0.002; // d3 stops the simulation here instead of ticking until cooldownTime
const DOUBLE_CLICK_MS = 350;
const FLY_MS = 900;
const FIT_MS = 700;
const FOCUS_DISTANCE = 60;
const AUTO_ROTATE_SPEED = 0.45;
const ORBIT_KEY_STEP = 0.08;
const DETAIL_MEDIUM_PX = 7; // on-screen radius where spheres switch to the medium geometry
const DETAIL_SMOOTH_PX = 22; // and to the smooth one
// Depth rules for names (distances are in units of the graph's radius, measured from its centre):
const DEPTH_FRONT_EDGE = 0.35; // a node this far in front of the centre has a full-strength label
const DEPTH_BACK_EDGE = 0.1; // behind this the label has faded out completely
const DEPTH_MIN_WEIGHT = 0.04;
const NEAR_SCORE_WEIGHT = 0.8; // closer nodes win the screen space first
const DEGREE_SCORE_WEIGHT = 0.015;
const DEGREE_SCORE_CAP = 10;
const LABEL_STICKY_BONUS = 0.25; // a label already showing keeps its place unless clearly outranked
const ORBIT_POLE_MARGIN = 0.05;
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
    assets: createSharedAssets(qualityTier(0).sphereLevels),
    gravity: createGravityForce(0),
    focus: computeFocus({ hoverId: null, adjacency: new Map(), matchIds: null, clusterIds: null }),
    hoverId: null,
    matchIds: null,
    clusterIds: null,
    links: [],
    linksOf: new Map(),
    linkMats: createLinkMaterials(),
    retired: [],
    retireTimer: 0,
    hot: new Set(),
    fading: new Set(),
    focusDirty: false,
    labelCount: 0,
    labelsCreated: 0,
    labelPass: 0,
    forceResize: false,
    width: 0,
    height: 0,
    lastFrameT: 0,
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

  // Monochrome on purpose: hubs shade toward the foreground colour, everything else stays neutral grey.
  const colorOf = (node) => mixInts(s.style.neutral, s.style.fgInt, clamp01((node.degree ?? 0) / 10) * 0.7);

  // --- node styling -------------------------------------------------------

  const styleOne = (parts) => {
    const { style, focus } = s;
    const lit = isLit(focus, parts.node.id);
    const hovered = focus.hoverId === parts.node.id;
    stylePart(parts, {
      radius: nodeRadius(parts.node, parts.node.degree, style.nodeSize) * (hovered ? HOVER_SCALE : 1),
      color: colorOf(parts.node),
      opacity: lit ? 1 : DIM_OPACITY,
    });
    repositionLabel(parts);
  };

  const styleAll = () => {
    if (!s.style) return;
    s.parts.forEach(styleOne);
  };

  // --- links ---------------------------------------------------------------

  // Hands out shared materials; a hover swaps pointers instead of asking the library to rebuild every link.
  const materialForLink = (link) => {
    if (!s.style) return undefined;
    const a = endId(link.source);
    const b = endId(link.target);
    const node = s.nodeById.get(a);
    const base = node ? colorOf(node) : s.style.neutral;
    const state = linkState(s.focus, a, b);
    const color = state === "bright" ? mixInts(base, s.style.fgInt, LINK_BRIGHT_MIX) : base;
    return s.linkMats.get(color, LINK_ALPHA[state]);
  };

  const swapLinkMaterial = (link) => {
    const object = link.__lineObj; // set by three-forcegraph once the link has a three.js object
    const material = object ? materialForLink(link) : undefined;
    if (material) object.material = material;
  };

  /** @param {string[]|null} changedIds node ids whose state changed; null restyles every link */
  const restyleLinks = (changedIds) => {
    if (!s.style) return;
    if (changedIds === null || changedIds.length * 2 > s.nodes.length) {
      s.links.forEach(swapLinkMaterial);
      return;
    }
    const done = new Set();
    changedIds.forEach((id) => {
      (s.linksOf.get(id) || []).forEach((link) => {
        if (done.has(link)) return;
        done.add(link);
        swapLinkMaterial(link);
      });
    });
  };

  // Disposed late: the library swaps its link objects over on its next update, and until then they may still draw with these.
  const retireMaterials = (materials) => {
    if (materials.length === 0) return;
    s.retired.push(...materials);
    if (s.retireTimer) return;
    s.retireTimer = window.setTimeout(() => {
      s.retired.forEach((m) => m.dispose());
      s.retired = [];
      s.retireTimer = 0;
    }, RETIRE_DELAY_MS);
  };

  // Only the nodes whose lit/hover state changed are restyled, and only links touching them.
  const applyFocus = () => {
    const prev = s.focus;
    s.focus = computeFocus({
      hoverId: s.hoverId, adjacency: s.adjacency, matchIds: s.matchIds, clusterIds: s.clusterIds,
    });
    if (!s.style) return;
    const changed = diffFocus(prev, s.focus, s.parts.keys());
    changed.forEach((id) => styleOne(s.parts.get(id)));
    restyleLinks(changed);
    updateLabels(true);
  };

  // --- labels ---------------------------------------------------------------

  const projected = new Vector3();

  // Screen-constant size: world height grows with camera distance, within a clamp.
  const labelWorldHeight = (dist, fontSize) => {
    const base = LABEL_TEXT_HEIGHT * fontSize;
    return Math.min(Math.max(base, dist * LABEL_SCREEN_RATIO * fontSize), dist * LABEL_MAX_RATIO * fontSize + base);
  };

  const setLabelTarget = (parts, target) => {
    if (!parts.label) return;
    parts.labelTarget = target;
    if (target > 0) parts.label.visible = true;
    if (parts.labelOpacity !== target) s.fading.add(parts);
  };

  const stepFades = (dt) => {
    if (s.fading.size === 0) return;
    const step = reducedMotion ? 1 : dt / LABEL_FADE_MS;
    s.fading.forEach((parts) => {
      if (!parts.label) {
        s.fading.delete(parts);
        return;
      }
      parts.labelOpacity = stepToward(parts.labelOpacity, parts.labelTarget, step);
      parts.label.material.opacity = parts.labelOpacity;
      if (parts.labelOpacity === parts.labelTarget) {
        parts.label.visible = parts.labelTarget > 0;
        s.fading.delete(parts);
      }
    });
  };

  // Frees the canvas textures of labels that have been hidden the longest.
  const trimLabelPool = () => {
    const max = s.tier.labelCap * LABEL_POOL_FACTOR;
    if (s.labelCount <= max) return;
    const idle = [];
    s.parts.forEach((parts) => {
      if (parts.label && parts.labelTarget === 0 && parts.labelOpacity === 0) idle.push(parts);
    });
    idle.sort((a, b) => (a.labelSeen ?? 0) - (b.labelSeen ?? 0));
    idle.slice(0, Math.min(s.labelCount - max, LABEL_RELEASE_PER_PASS)).forEach((parts) => {
      releaseLabel(parts);
      s.fading.delete(parts);
      s.labelCount -= 1;
    });
  };

  // How far in front of the graph's centre a node is, as 0..1: nodes facing the viewer count fully, nodes
  // on the far side fade out, with a soft band between so rotating changes names gradually, not abruptly.
  const frontWeight = (dist, centerDist, radius) => {
    const t = (centerDist - dist) / Math.max(1e-3, radius); // +1 at the near edge of the graph, -1 at the far edge
    const x = clamp01((t + DEPTH_BACK_EDGE) / (DEPTH_FRONT_EDGE + DEPTH_BACK_EDGE));
    return x * x * (3 - 2 * x);
  };

  // Sphere detail by on-screen radius: a node you are close to is a smooth sphere, a distant dot stays coarse.
  const updateDetail = (camera) => {
    const pxPerUnit = s.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    s.parts.forEach((parts) => {
      const n = parts.node;
      if (n.x === undefined) return;
      const dist = Math.max(1e-3, Math.hypot(camera.position.x - n.x, camera.position.y - n.y, camera.position.z - n.z));
      const radiusPx = (parts.radius * pxPerUnit) / dist;
      setDetail(parts, radiusPx >= DETAIL_SMOOTH_PX ? 2 : radiusPx >= DETAIL_MEDIUM_PX ? 1 : 0, s.assets);
    });
  };

  const collectCandidates = (camera) => {
    const { focus, style } = s;
    const { center, radius } = boundingSphere(s.nodes);
    const target = graph.controls().target ?? center;
    const centerDist = Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z);
    const pxPerUnit = s.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const candidates = [];
    s.parts.forEach((parts) => {
      const n = parts.node;
      if (n.x === undefined) return;
      if (focus.lit !== null && !focus.lit.has(n.id)) return;
      projected.set(n.x, n.y, n.z).project(camera);
      if (projected.z < -1 || projected.z > 1) return; // behind the camera or past the far plane
      const dist = Math.max(1e-3, Math.hypot(camera.position.x - n.x, camera.position.y - n.y, camera.position.z - n.z));
      const worldHeight = labelWorldHeight(dist, style.fontSize);
      const pxPerWorld = pxPerUnit / dist;
      const { width, height } = estimateLabelSize(n.title, worldHeight * pxPerWorld);
      const hovered = focus.hoverId === n.id;
      const emphasised = focus.kind === "hover" || focus.kind === "search";
      const scale = worldHeight / LABEL_TEXT_HEIGHT;
      const front = frontWeight(dist, centerDist, radius);
      // Focus (hover/search) overrides depth; otherwise a node on the far side gets no label at all.
      if (!emphasised && front < DEPTH_MIN_WEIGHT) return;
      const nearness = clamp01((centerDist - dist) / Math.max(1e-3, radius));
      const wasShown = parts.labelTarget > 0 ? LABEL_STICKY_BONUS : 0;
      const score = front + nearness * NEAR_SCORE_WEIGHT + Math.min(n.degree, DEGREE_SCORE_CAP) * DEGREE_SCORE_WEIGHT + wasShown;
      candidates.push({
        id: n.id,
        title: n.title,
        degree: n.degree,
        score,
        front,
        priority: hovered ? LABEL_PRIORITY.hovered : emphasised ? LABEL_PRIORITY.emphasised : LABEL_PRIORITY.normal,
        x: ((projected.x + 1) / 2) * s.width,
        y: ((1 - projected.y) / 2) * s.height - labelOffset(parts, scale) * pxPerWorld,
        width,
        height,
        scale,
      });
    });
    return candidates;
  };

  function updateLabels(force = false) {
    if (!s.style || s.width <= 0 || s.height <= 0) return;
    const now = performance.now();
    if (!force && now - s.lastLabelPass < LABEL_INTERVAL_MS) return;
    s.lastLabelPass = now;
    s.labelPass += 1;
    const camera = graph.camera();
    camera.updateMatrixWorld();
    updateDetail(camera);
    const candidates = collectCandidates(camera);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const accepted = layoutLabels({ candidates, viewport: { width: s.width, height: s.height }, cap: s.tier.labelCap });
    const keep = new Set(accepted);

    let created = 0;
    accepted.forEach((id) => {
      const parts = s.parts.get(id);
      const c = byId.get(id);
      if (!parts.label) {
        if (created >= LABEL_MAX_NEW_PER_PASS) return;
        ensureLabel(parts, parts.node.title, intToHex(s.style.textInt), s.style.fontFace, c.scale);
        s.labelCount += 1;
        s.labelsCreated += 1;
        created += 1;
      } else if (s.forceResize || changedBeyond(parts.labelScale, c.scale, LABEL_RESIZE_TOLERANCE)) {
        resizeLabel(parts, c.scale);
      }
      parts.labelSeen = s.labelPass;
      setLabelTarget(parts, c.priority > LABEL_PRIORITY.normal ? 1 : LABEL_OPACITY * c.front);
    });
    s.forceResize = false;
    s.parts.forEach((parts, id) => {
      if (parts.label && !keep.has(id)) setLabelTarget(parts, 0);
    });
    trimLabelPool();
  }

  const dropParts = (parts) => {
    if (parts.label) s.labelCount -= 1;
    s.fading.delete(parts);
    s.hot.delete(parts);
    disposeParts(parts);
  };

  // --- frame loop (own raf, runs only while visible) -------------------------

  const frame = (t) => {
    s.raf = 0;
    if (s.destroyed || s.paused) return;
    const dt = s.lastFrameT ? Math.min(MAX_FRAME_DT_MS, t - s.lastFrameT) : 16;
    s.lastFrameT = t;
    if (s.focusDirty) {
      s.focusDirty = false;
      applyFocus();
    }
    if (!reducedMotion && s.hot.size > 0) {
      const pulse = (Math.sin(t / 450) + 1) / 2;
      s.hot.forEach((parts) => pulseRing(parts, pulse));
    }
    stepFades(dt);
    updateLabels();
    s.raf = requestAnimationFrame(frame);
  };

  const startLoop = () => {
    if (!s.raf && !s.destroyed && !s.paused) {
      s.lastFrameT = 0;
      s.raf = requestAnimationFrame(frame);
    }
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
    .linkMaterial(materialForLink)
    .warmupTicks(40)
    .d3AlphaMin(ALPHA_MIN)
    .cooldownTime(9000)
    .nodeThreeObject((node) => {
      const old = s.parts.get(node.id);
      if (old) dropParts(old);
      const parts = createNodeParts(node, s.assets);
      s.parts.set(node.id, parts);
      if (parts.ring) s.hot.add(parts);
      if (s.style) styleOne(parts);
      return parts.group;
    })
    .onNodeHover((node) => {
      const id = node ? node.id : null;
      if (id !== s.hoverId) {
        s.hoverId = id;
        s.focusDirty = true; // restyled once per animation frame, however many hover events arrive
      }
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
  // The graph stays centred: orbit and zoom only. Panning (right-drag, Ctrl+click on a Mac, two-finger
  // gestures, arrow keys) would slide it out of the viewport, so it is off and the arrow keys orbit instead.
  controls.enablePan = false;
  const orbitOffset = new Vector3();
  const orbitSpherical = new Spherical();
  const orbitBy = (dTheta, dPhi) => {
    const camera = graph.camera();
    const target = controls.target ?? new Vector3();
    orbitOffset.copy(camera.position).sub(target);
    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta += dTheta;
    orbitSpherical.phi = Math.min(Math.PI - ORBIT_POLE_MARGIN, Math.max(ORBIT_POLE_MARGIN, orbitSpherical.phi + dPhi));
    orbitOffset.setFromSpherical(orbitSpherical);
    camera.position.copy(target).add(orbitOffset);
    camera.lookAt(target);
    controls.update?.();
  };
  const ARROW_ORBIT = {
    ArrowLeft: [ORBIT_KEY_STEP, 0], ArrowRight: [-ORBIT_KEY_STEP, 0], ArrowUp: [0, ORBIT_KEY_STEP], ArrowDown: [0, -ORBIT_KEY_STEP],
  };
  const handleOrbitKey = (event) => {
    const step = ARROW_ORBIT[event.key];
    if (!step) return;
    event.preventDefault();
    stopAutoRotate();
    orbitBy(step[0], step[1]);
  };
  container.addEventListener("keydown", handleOrbitKey);

  const canvas = graph.renderer().domElement;
  const handleContextLost = (event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);
  startLoop();

  // Dev-only probe for measuring the scene from the console or a test harness; tree-shaken from production builds.
  const readStats = () => {
    const { render, memory } = graph.renderer().info ?? {};
    let labelsVisible = 0;
    s.parts.forEach((parts) => {
      if (parts.label?.visible) labelsVisible += 1;
    });
    return {
      calls: render?.calls ?? 0,
      triangles: render?.triangles ?? 0,
      geometries: memory?.geometries ?? 0,
      textures: memory?.textures ?? 0,
      labelsVisible,
      labelsCreated: s.labelsCreated,
      nodes: s.nodes.length,
      links: s.links.length,
    };
  };
  if (import.meta.env.DEV) window.__maiaGraphStats = readStats;

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
    if (s.widthKey === null || s.widthKey > 0 !== width > 0) retireMaterials(s.linkMats.reset(width > 0));
    s.widthKey = width;
    graph.linkWidth(width);
  };

  return {
    setStyle(style) {
      const prev = s.style;
      const themeChanged = !prev || prev.bgInt !== style.bgInt || prev.textInt !== style.textInt;
      const linkColorsChanged = !prev || prev.neutral !== style.neutral || prev.fgInt !== style.fgInt;
      if (!prev || prev.fontSize !== style.fontSize) s.forceResize = true;
      s.style = style;
      graph.backgroundColor(intToHex(style.bgInt));
      applyForces();
      applyWidth();
      styleAll();
      if (linkColorsChanged) restyleLinks(null);
      if (themeChanged) s.parts.forEach((parts) => setLabelColor(parts, intToHex(style.textInt)));
      updateLabels(true);
    },

    setData({ nodes, links }) {
      const tier = qualityTier(nodes.length, window.devicePixelRatio);
      const tierChanged = tier.heavy !== s.tier.heavy;
      s.tier = tier;
      s.nodes = nodes;
      s.nodeById = new Map(nodes.map((n) => [n.id, n]));
      s.adjacency = buildAdjacency(links);
      s.links = links;
      s.linksOf = new Map();
      links.forEach((link) => {
        [endId(link.source), endId(link.target)].forEach((id) => {
          if (!s.linksOf.has(id)) s.linksOf.set(id, []);
          s.linksOf.get(id).push(link);
        });
      });
      s.parts.forEach((parts, id) => {
        if (s.nodeById.get(id) === parts.node) return;
        dropParts(parts);
        s.parts.delete(id);
      });
      if (s.hoverId && !s.nodeById.has(s.hoverId)) s.hoverId = null;
      graph.renderer().setPixelRatio(tier.pixelRatio);
      if (tierChanged) {
        s.assets.setLevels(tier.sphereLevels);
        s.parts.forEach((parts) => {
          parts.detail = -1; // forces setDetail to pick the new geometry on the next pass
        });
      }
      if (s.style) applyWidth();
      graph.graphData({ nodes, links });
      if (tierChanged) graph.refresh();
      s.focusDirty = true; // the frame loop diffs the new focus against what is drawn
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
      s.focusDirty = true;
    },

    setSize(width, height) {
      if (width <= 0 || height <= 0) return;
      s.width = width;
      s.height = height;
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
      container.removeEventListener("keydown", handleOrbitKey);
      window.clearTimeout(s.retireTimer);
      s.retired.forEach((m) => m.dispose());
      s.retired = [];
      s.linkMats.dispose();
      s.parts.forEach(disposeParts);
      s.parts.clear();
      s.fading.clear();
      s.hot.clear();
      s.assets.dispose();
      if (import.meta.env.DEV && window.__maiaGraphStats === readStats) delete window.__maiaGraphStats;
      graph.renderer().forceContextLoss?.();
      graph._destructor();
      container.replaceChildren();
    },
  };
};

// three.js objects for one node: a flat-shaded sphere, a pulse ring for hot
// nodes only and (created lazily) a text label. Geometry and the ring texture
// are shared; materials are per node because opacity is per node.
import {
  DataTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, RGBAFormat, SphereGeometry, Sprite, SpriteMaterial,
  SRGBColorSpace, UnsignedByteType,
} from "three";
import SpriteText from "three-spritetext";

const TEXTURE_SIZE = 64;
const RING_SCALE = 3.1;
const LABEL_GAP = 1.3;
export const LABEL_TEXT_HEIGHT = 3.2;
const noRaycast = () => {};

// Builds the ring texture from numbers rather than a canvas gradient: no
// colour strings, works without a 2D context, and the falloff is exact.
const makeRingTexture = () => {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const dx = ((x + 0.5) / TEXTURE_SIZE) * 2 - 1;
      const dy = ((y + 0.5) / TEXTURE_SIZE) * 2 - 1;
      const a = Math.max(0, Math.min(1, 1 - Math.abs(Math.hypot(dx, dy) - 0.82) / 0.1));
      const i = (y * TEXTURE_SIZE + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const texture = new DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

/** Shared resources for one scene. Call `dispose()` on teardown. The ring texture is only built when a hot node asks for it. */
export const createSharedAssets = (segments) => {
  let ringTexture = null;
  let geometry = new SphereGeometry(1, segments, segments);
  return {
    get ringTexture() {
      if (!ringTexture) ringTexture = makeRingTexture();
      return ringTexture;
    },
    get geometry() { return geometry; },
    setSegments(next) {
      geometry.dispose();
      geometry = new SphereGeometry(1, next, next);
    },
    dispose() {
      ringTexture?.dispose();
      geometry.dispose();
    },
  };
};

const makeRing = (texture) => {
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.raycast = noRaycast; // the ring must not widen the hover target
  sprite.renderOrder = 2;
  return sprite;
};

/** @returns {object} parts: { group, mesh, ring, label, node, radius, opacity, labelScale, labelOpacity, labelTarget } */
export const createNodeParts = (node, assets) => {
  const group = new Group();
  const mesh = new Mesh(assets.geometry, new MeshBasicMaterial());
  group.add(mesh);
  let ring = null;
  if (node.isHot) {
    ring = makeRing(assets.ringTexture);
    group.add(ring);
  }
  return {
    group, mesh, ring, label: null, node, radius: 1, opacity: 1, labelScale: 1, labelOpacity: 0, labelTarget: 0, labelBase: null,
  };
};

export const labelOffset = (parts, scale) => parts.radius + LABEL_TEXT_HEIGHT * scale * LABEL_GAP;

// SpriteText regenerates its canvas and texture on every textHeight/color/font
// change, so a label is built once at a fixed text height and resized through
// the sprite scale, which is free.
const applyLabelScale = (parts, scale) => {
  const { label, labelBase } = parts;
  parts.labelScale = scale;
  label.scale.set(labelBase.x * scale, labelBase.y * scale, 0);
  label.position.y = labelOffset(parts, scale);
};

export const ensureLabel = (parts, text, color, fontFace, scale) => {
  if (parts.label) return parts.label;
  const label = new SpriteText(text, LABEL_TEXT_HEIGHT, color);
  label.fontFace = fontFace;
  label.fontWeight = "400";
  label.material.depthWrite = false;
  label.material.depthTest = false;
  label.material.opacity = 0;
  label.renderOrder = 30;
  label.raycast = noRaycast;
  parts.label = label;
  parts.labelBase = { x: label.scale.x, y: label.scale.y };
  parts.labelOpacity = 0;
  parts.labelTarget = 0;
  applyLabelScale(parts, scale);
  parts.group.add(label);
  return label;
};

/** `scale` is the label height in world units divided by LABEL_TEXT_HEIGHT. */
export const resizeLabel = (parts, scale) => {
  if (parts.label) applyLabelScale(parts, scale);
};

/** Keeps the label above the sphere after the radius changed. */
export const repositionLabel = (parts) => {
  if (parts.label) parts.label.position.y = labelOffset(parts, parts.labelScale);
};

export const setLabelColor = (parts, color) => {
  if (!parts.label) return;
  parts.label.color = color; // regenerates the canvas, which resets the scale
  applyLabelScale(parts, parts.labelScale);
};

/** Removes the label from the node and frees its canvas texture. */
export const releaseLabel = (parts) => {
  const { label } = parts;
  if (!label) return;
  parts.group.remove(label);
  label.material.map?.dispose();
  label.material.dispose();
  parts.label = null;
  parts.labelBase = null;
  parts.labelOpacity = 0;
  parts.labelTarget = 0;
};

/** Radius, colour and opacity in one pass; cheap enough to run for the nodes whose state changed. */
export const stylePart = (parts, { radius, color, opacity }) => {
  parts.radius = radius;
  parts.opacity = opacity;
  parts.mesh.scale.setScalar(radius);
  parts.mesh.material.color.setHex(color);
  parts.mesh.material.opacity = opacity;
  // Opaque spheres skip the transparent sort and keep early depth rejection.
  parts.mesh.material.transparent = opacity < 1;
  if (parts.ring) {
    parts.ring.material.color.setHex(color);
    pulseRing(parts, 0.5);
  }
};

/** `pulse` is 0 to 1; the ring breathes in scale and opacity. */
export const pulseRing = (parts, pulse) => {
  if (!parts.ring) return;
  parts.ring.scale.setScalar(parts.radius * (RING_SCALE + pulse * 0.5));
  parts.ring.material.opacity = parts.opacity * (0.45 + pulse * 0.4);
};

export const disposeParts = (parts) => {
  parts.mesh.material.dispose();
  parts.ring?.material.dispose();
  releaseLabel(parts);
};

// three.js objects for one node: a flat-shaded sphere, an additive glow sprite,
// a pulse ring for hot nodes and (created lazily) a text label. Geometry and
// textures are shared; materials are per node because opacity is per node.
import {
  AdditiveBlending, DataTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, NormalBlending,
  RGBAFormat, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, UnsignedByteType,
} from "three";
import SpriteText from "three-spritetext";

const TEXTURE_SIZE = 64;
const GLOW_SCALE = 6.5;
const RING_SCALE = 3.1;
const LABEL_GAP = 1.3;
export const LABEL_TEXT_HEIGHT = 3.2;
const noRaycast = () => {};

// Builds the sprite textures from numbers rather than a canvas gradient: no
// colour strings, works without a 2D context, and the falloff is exact.
const makeTexture = (alphaAt) => {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const dx = ((x + 0.5) / TEXTURE_SIZE) * 2 - 1;
      const dy = ((y + 0.5) / TEXTURE_SIZE) * 2 - 1;
      const a = Math.max(0, Math.min(1, alphaAt(Math.hypot(dx, dy))));
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

/** Shared resources for one scene. Call `dispose()` on teardown. */
export const createSharedAssets = (segments) => {
  const glowTexture = makeTexture((r) => (1 - r) ** 2.2);
  const ringTexture = makeTexture((r) => 1 - Math.abs(r - 0.82) / 0.1);
  let geometry = new SphereGeometry(1, segments, segments);
  return {
    glowTexture,
    ringTexture,
    get geometry() { return geometry; },
    setSegments(next) {
      geometry.dispose();
      geometry = new SphereGeometry(1, next, next);
    },
    dispose() {
      glowTexture.dispose();
      ringTexture.dispose();
      geometry.dispose();
    },
  };
};

const makeSprite = (texture, additive) => {
  const sprite = new Sprite(new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  }));
  sprite.raycast = noRaycast; // glow must not widen the hover target
  sprite.renderOrder = 2;
  return sprite;
};

/** @returns {object} parts: { group, mesh, glow, ring, label, node, radius, opacity } */
export const createNodeParts = (node, assets) => {
  const group = new Group();
  const mesh = new Mesh(assets.geometry, new MeshBasicMaterial({ transparent: true }));
  const glow = makeSprite(assets.glowTexture, true);
  group.add(glow, mesh);
  let ring = null;
  if (node.isHot) {
    ring = makeSprite(assets.ringTexture, false);
    group.add(ring);
  }
  return { group, mesh, glow, ring, label: null, node, radius: 1, opacity: 1 };
};

export const labelOffset = (parts, scale) => parts.radius + LABEL_TEXT_HEIGHT * scale * LABEL_GAP;

export const ensureLabel = (parts, text, color, fontFace, scale) => {
  if (parts.label) return parts.label;
  const label = new SpriteText(text, LABEL_TEXT_HEIGHT * scale, color);
  label.fontFace = fontFace;
  label.fontWeight = "400";
  label.material.depthWrite = false;
  label.material.depthTest = false;
  label.renderOrder = 30;
  label.raycast = noRaycast;
  label.position.y = labelOffset(parts, scale);
  parts.group.add(label);
  parts.label = label;
  return label;
};

export const resizeLabel = (parts, scale) => {
  if (!parts.label) return;
  parts.label.textHeight = LABEL_TEXT_HEIGHT * scale;
  parts.label.position.y = labelOffset(parts, scale);
};

/** Radius, colour, glow and opacity in one pass; cheap enough to run for every node. */
export const stylePart = (parts, { radius, color, opacity, glow, glowOpacity }) => {
  parts.radius = radius;
  parts.opacity = opacity;
  parts.mesh.scale.setScalar(radius);
  parts.mesh.material.color.setHex(color);
  parts.mesh.material.opacity = opacity;
  parts.glow.visible = glow;
  parts.glow.scale.setScalar(radius * GLOW_SCALE);
  parts.glow.material.color.setHex(color);
  parts.glow.material.opacity = glowOpacity * opacity;
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
  parts.glow.material.dispose();
  parts.ring?.material.dispose();
  if (parts.label) {
    parts.label.material.map?.dispose();
    parts.label.material.dispose();
  }
};

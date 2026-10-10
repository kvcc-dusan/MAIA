import React from "react";
import styles from "./Sparkline.module.css";

const W = 120;
const H = 32;
const PAD = 3;

/** Tiny line of per-week counts. Decorative to the eye, but the text alternative lists every value. */
export default function Sparkline({ values, label }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg className={styles.root} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${values.join(", ")}`} preserveAspectRatio="none">
      <polyline points={line} className={styles.line} vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2.5" className={styles.dot} />
    </svg>
  );
}

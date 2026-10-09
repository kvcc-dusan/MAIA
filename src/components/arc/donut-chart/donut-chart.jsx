import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, frame, cancelFrame, motion, motionValue, useInView, useReducedMotion } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./donut-chart.module.css";
const OTHER = "__other";
const TAU = Math.PI * 2;
const { spring, ease, stagger, duration } = motionTokens;
const physical = ({ visualDuration, bounce }, restDelta = 5e-4) => {
  const root = 2 * Math.PI / (visualDuration * 1.2);
  return { type: "spring", stiffness: root * root, damping: 2 * (1 - bounce) * root, restDelta, restSpeed: restDelta * 2 };
};
const reveal = physical({ visualDuration: 0.72, bounce: 0 });
const settle = physical({ visualDuration: 0.5, bounce: 0 });
const pop = physical(spring.snappy, 2e-3);
const NEUTRAL = [56, 42, 32];
const seriesColor = (index) => index < 4 ? `var(--series-${index + 1})` : `color-mix(in oklab, var(--foreground) ${NEUTRAL[(index - 4) % NEUTRAL.length]}%, var(--surface))`;
const OTHER_COLOR = "color-mix(in oklab, var(--foreground) 26%, var(--surface))";
const LIFT = 4, GROW = 2, MARGIN = 7, GAP = 3, CORNER = 4;
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const shareText = (share) => share > 0 && share < 0.01 ? "<1%" : percent.format(share);
function sliceData(data, groupBelow, maxSegments, otherLabel) {
  const parts = data.filter((item) => item.value > 0);
  const total = parts.reduce((sum, item) => sum + item.value, 0);
  if (!total) return [];
  const ranked = [...parts].sort((a, b) => b.value - a.value);
  const keep = new Set(ranked.filter((item, rank) => item.value / total >= groupBelow && rank < maxSegments - 1).map((item) => item.key));
  const rest = parts.filter((item) => !keep.has(item.key));
  if (rest.length < 2) return parts.map((item) => ({ ...item }));
  return [...parts.filter((item) => keep.has(item.key)).map((item) => ({ ...item })), { key: OTHER, label: otherLabel, value: rest.reduce((sum, item) => sum + item.value, 0), members: rest }];
}
function layout(slices, hidden) {
  const total = slices.reduce((sum, item) => sum + (hidden.has(item.key) ? 0 : item.value), 0) || 1;
  let at = 0;
  return new Map(slices.map((item) => {
    const arc = { start: at, end: at + (hidden.has(item.key) ? 0 : item.value / total) };
    at = arc.end;
    return [item.key, arc];
  }));
}
function breadth(R, t0, t1, gap) {
  const turns = t1 - t0;
  if (turns >= 1 - 1e-6) return Infinity;
  return Math.sin(Math.min(turns * Math.PI, Math.PI / 2)) * R - Math.min(gap / 2, (1 - turns) * TAU * R / 2);
}
const n2 = (value) => (Math.round(value * 100) / 100).toString();
function sector(c, R, r, t0, t1, gap, corner) {
  const turns = t1 - t0;
  if (turns <= 1e-6) return "";
  const at = (radius, angle) => `${n2(c + radius * Math.cos(angle))} ${n2(c + radius * Math.sin(angle))}`;
  if (turns >= 1 - 1e-6) return `M${at(R, -Math.PI / 2)}A${n2(R)} ${n2(R)} 0 1 1 ${at(R, Math.PI / 2)}A${n2(R)} ${n2(R)} 0 1 1 ${at(R, -Math.PI / 2)}ZM${at(r, -Math.PI / 2)}A${n2(r)} ${n2(r)} 0 1 0 ${at(r, Math.PI / 2)}A${n2(r)} ${n2(r)} 0 1 0 ${at(r, -Math.PI / 2)}Z`;
  const p = Math.min(gap / 2, (1 - turns) * TAU * R / 2);
  const a0 = t0 * TAU - Math.PI / 2, a1 = t1 * TAU - Math.PI / 2, half = (a1 - a0) / 2, s = Math.sin(Math.min(half, Math.PI / 2));
  if (s * R <= p + 1e-6) return "";
  const side = (t, angle, sign) => `${n2(c + t * Math.cos(angle) - sign * p * Math.sin(angle))} ${n2(c + t * Math.sin(angle) + sign * p * Math.cos(angle))}`;
  const band = (R - r) / 2;
  const ro = Math.max(0, Math.min(corner, band, s >= 0.9999 ? Infinity : (s * R - p) / (1 + s)));
  const dO = Math.asin(Math.min(1, (p + ro) / (R - ro))), tO = Math.sqrt(Math.max(0, (R - ro) ** 2 - (p + ro) ** 2));
  const bigO = a1 - a0 - 2 * dO > Math.PI ? 1 : 0;
  let d = `M${side(tO, a0, 1)}`;
  if (ro > 0.01) d += `A${n2(ro)} ${n2(ro)} 0 0 1 ${at(R, a0 + dO)}`;
  d += `A${n2(R)} ${n2(R)} 0 ${bigO} 1 ${at(R, a1 - dO)}`;
  if (ro > 0.01) d += `A${n2(ro)} ${n2(ro)} 0 0 1 ${side(tO, a1, -1)}`;
  if (s * r > p + 1e-6 || s >= 0.9999) {
    const ri = Math.max(0, Math.min(corner, band, s >= 0.9999 ? Infinity : (s * r - p) / (1 - s)));
    const dI = Math.asin(Math.min(1, (p + ri) / (r + ri))), tI = Math.sqrt(Math.max(0, (r + ri) ** 2 - (p + ri) ** 2));
    const bigI = a1 - a0 - 2 * dI > Math.PI ? 1 : 0;
    d += `L${side(tI, a1, -1)}`;
    if (ri > 0.01) d += `A${n2(ri)} ${n2(ri)} 0 0 1 ${at(r, a1 - dI)}`;
    d += `A${n2(r)} ${n2(r)} 0 ${bigI} 0 ${at(r, a0 + dI)}`;
    if (ri > 0.01) d += `A${n2(ri)} ${n2(ri)} 0 0 1 ${side(tI, a0, 1)}`;
  } else d += `L${at(p / s, (a0 + a1) / 2)}`;
  return `${d}Z`;
}
function Count({ value, format, reduced }) {
  const node = useRef(null);
  const [initial] = useState(() => format(value));
  const live = useRef(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (!live.current) {
      const state2 = { mv: motionValue(value), format, target: value };
      state2.mv.on("change", (now) => {
        el.textContent = state2.format(Number.isInteger(state2.target) ? Math.round(now) : now);
      });
      live.current = state2;
    }
    const state = live.current;
    state.format = format;
    if (state.target === value && !reduced) {
      if (!state.mv.isAnimating()) el.textContent = format(value);
      return;
    }
    state.target = value;
    if (reduced) {
      state.mv.jump(value);
      el.textContent = format(value);
      return;
    }
    animate(state.mv, value, physical({ visualDuration: 0.4, bounce: 0 }, Math.max(Math.abs(value - state.mv.get()) * 1e-3, 1e-6)));
  }, [value, format, reduced]);
  useEffect(() => () => {
    live.current?.mv.destroy();
    live.current = null;
  }, []);
  return <span ref={node}>{initial}</span>;
}
const drum = (place, reduced) => ({
  animate: { opacity: place === 0 ? 1 : 0, y: `${0.45 * Math.sign(place)}em` },
  transition: reduced ? { duration: 0 } : place === 0 ? { duration: duration.standard, ease: [...ease.enter] } : { duration: duration.fast, ease: [...ease.standard] }
});
const subscribeNothing = () => () => {
};
function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return !!useReducedMotion() && hydrated;
}
export function DonutChart({ data, label, unit = "", formatValue = (value) => grouped.format(value), totalLabel = "Total", size = 208, thickness = 24, groupBelow = 0.04, maxSegments = 6, otherLabel = "Other", activeKey, defaultActiveKey = null, onActiveChange, hiddenKeys, defaultHiddenKeys, onHiddenKeysChange, legendAction = "toggle", legend = true, emptyLabel = "No data yet", ref, className }) {
  const reduced = useReducedMotionSafe();
  const figure = useRef(null);
  useImperativeHandle(ref, () => figure.current);
  const inView = useInView(figure, { once: true, amount: 0.35 });
  const legendId = useId();
  const slices = sliceData(data, groupBelow, maxSegments, otherLabel);
  const [ownHidden, setOwnHidden] = useState(defaultHiddenKeys ?? []);
  const hiddenList = hiddenKeys ?? ownHidden;
  const hidden = new Set(hiddenList.filter((key) => slices.some((item) => item.key === key)));
  const visible = slices.filter((item) => !hidden.has(item.key));
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const signature = `${slices.map((item) => `${item.key}:${item.value}${hidden.has(item.key) ? "h" : ""}`).join("|")}`;
  const suffix = unit ? ` ${unit}` : "";
  const [palette, setPalette] = useState(() => new Map(data.map((item, index) => [item.key, index])));
  if (data.some((item) => !palette.has(item.key))) {
    const next = new Map(palette);
    for (const item of data) if (!next.has(item.key)) next.set(item.key, next.size);
    setPalette(next);
  }
  const colorFor = (item) => item.color ?? (item.key === OTHER ? OTHER_COLOR : seriesColor(palette.get(item.key) ?? 0));
  const [drawn, setDrawn] = useState(slices);
  const [seenSignature, setSeenSignature] = useState(signature);
  if (seenSignature !== signature) {
    setSeenSignature(signature);
    const next = [...slices];
    drawn.forEach((item, index) => {
      if (next.some((slice) => slice.key === item.key)) return;
      const before = drawn.slice(0, index).reverse().find((prior) => next.some((slice) => slice.key === prior.key));
      next.splice(before ? next.findIndex((slice) => slice.key === before.key) + 1 : 0, 0, { ...item, value: 0 });
    });
    setDrawn(next);
  }
  const [ownActive, setOwnActive] = useState(defaultActiveKey);
  const selected = activeKey !== void 0 ? activeKey : ownActive;
  const [preview, setPreview] = useState(null);
  const select = (key) => {
    if (activeKey === void 0) setOwnActive(key);
    onActiveChange?.(key);
  };
  const current = [preview, selected].find((key) => key && visible.some((item) => item.key === key)) ?? null;
  const activeSlice = visible.find((item) => item.key === current) ?? null;
  const [announcement, setAnnouncement] = useState("");
  const setHidden = (key) => {
    const isHidden = hidden.has(key);
    if (!isHidden && visible.length <= 1) return;
    const next = isHidden ? hiddenList.filter((item2) => item2 !== key) : [...hiddenList, key];
    if (hiddenKeys === void 0) setOwnHidden(next);
    onHiddenKeysChange?.(next);
    const item = slices.find((slice) => slice.key === key);
    const nextTotal = slices.reduce((sum, slice) => sum + (next.includes(slice.key) ? 0 : slice.value), 0);
    if (item) setAnnouncement(`${item.label} ${isHidden ? "shown" : "hidden"}. ${totalLabel} ${formatValue(nextTotal)}${suffix}.`);
  };
  const c = size / 2, outer = c - MARGIN, inner = Math.max(8, outer - thickness);
  const corner = Math.min(CORNER, thickness / 4);
  const geometry = useRef({ c, outer, inner, corner });
  const segments = useRef(/* @__PURE__ */ new Map());
  const paths = useRef(/* @__PURE__ */ new Map());
  const registerPath = useCallback((node) => {
    const key = node?.dataset.key;
    if (!node || !key) return;
    paths.current.set(key, node);
    return () => {
      if (paths.current.get(key) === node) paths.current.delete(key);
    };
  }, []);
  const paint = useCallback(() => {
    const { c: c2, outer: outer2, inner: inner2, corner: corner2 } = geometry.current;
    for (const [key, node] of paths.current) {
      const segment = segments.current.get(key);
      if (!segment) {
        node.setAttribute("d", "");
        continue;
      }
      const start = segment.start.get(), end = segment.end.get(), lift = Math.max(0, segment.lift.get());
      const R = outer2 + lift * GROW;
      node.setAttribute("d", sector(c2, R, inner2 - lift * GROW * 0.5, start, end, GAP, corner2));
      node.setAttribute("fill-opacity", n2(Math.min(1, Math.max(0, (breadth(R, start, end, GAP) - 1) / 3))));
      const middle = (start + end) / 2 * TAU - Math.PI / 2, distance = lift * LIFT;
      node.setAttribute("transform", `translate(${n2(Math.cos(middle) * distance)} ${n2(Math.sin(middle) * distance)})`);
    }
  }, []);
  const schedule = useCallback(() => {
    frame.render(paint);
  }, [paint]);
  useLayoutEffect(() => {
    geometry.current = { c, outer, inner, corner };
    paint();
  });
  useEffect(() => () => {
    cancelFrame(paint);
    for (const segment of segments.current.values()) segment.off();
    segments.current.clear();
  }, [paint]);
  const targets = useRef(/* @__PURE__ */ new Map());
  const latest = useRef({ drawn, slices });
  useLayoutEffect(() => {
    latest.current = { drawn, slices };
  });
  const shown = inView || reduced;
  useEffect(() => {
    if (!shown) return;
    const { drawn: order, slices: now } = latest.current;
    const goal = layout(now, hidden);
    targets.current = goal;
    const first = segments.current.size === 0;
    const place = (index) => {
      const before = order.slice(0, index).reverse().find((item) => goal.has(item.key));
      return before ? goal.get(before.key).end : 0;
    };
    const drop = (key) => {
      if (latest.current.slices.some((item) => item.key === key)) return;
      segments.current.get(key)?.off();
      segments.current.delete(key);
      setDrawn((list) => list.filter((item) => item.key !== key));
    };
    order.forEach((item, index) => {
      const leaving = !goal.has(item.key);
      const to = goal.get(item.key) ?? { start: place(index), end: place(index) };
      let segment = segments.current.get(item.key);
      if (!segment) {
        const prior = order.slice(0, index).reverse().map((entry) => segments.current.get(entry.key)).find(Boolean);
        const from = first ? 0 : prior ? prior.end.get() : 0;
        const start = motionValue(from), end = motionValue(from), lift = motionValue(0);
        const offs = [start.on("change", schedule), end.on("change", schedule), lift.on("change", schedule)];
        segment = { start, end, lift, off: () => {
          offs.forEach((off) => off());
          start.destroy();
          end.destroy();
          lift.destroy();
        } };
        segments.current.set(item.key, segment);
      }
      if (reduced) {
        segment.start.jump(to.start);
        segment.end.jump(to.end);
        if (leaving) drop(item.key);
        return;
      }
      if (first) {
        animate(segment.start, to.start, reveal);
        animate(segment.end, to.end, { ...reveal, delay: 0.04 + index * stagger.item });
        return;
      }
      animate(segment.start, to.start, settle);
      animate(segment.end, to.end, { ...settle, onComplete: leaving ? () => drop(item.key) : void 0 });
    });
    schedule();
  }, [shown, signature, reduced, schedule]);
  useEffect(() => {
    for (const [key, segment] of segments.current) {
      const to = key === current ? 1 : 0;
      if (reduced) segment.lift.jump(to);
      else if (segment.lift.get() !== to || segment.lift.isAnimating()) animate(segment.lift, to, pop);
    }
  }, [current, reduced, drawn, shown]);
  const svg = useRef(null);
  const hit = (event) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || !box.width) return void 0;
    const scale = size / box.width, x = (event.clientX - box.left) * scale - c, y = (event.clientY - box.top) * scale - c;
    const radius = Math.hypot(x, y);
    if (radius < inner - 6 || radius > c) return null;
    let turn = (Math.atan2(y, x) + Math.PI / 2) / TAU;
    if (turn < 0) turn += 1;
    for (const [key, arc] of targets.current) if (arc.end > arc.start && turn >= arc.start && turn < arc.end && visible.some((item) => item.key === key)) return key;
    return void 0;
  };
  const onRingMove = (event) => {
    if (event.pointerType !== "mouse") return;
    const key = hit(event);
    if (key !== void 0 && key !== preview) setPreview(key);
  };
  const onRingClick = (event) => {
    const key = hit(event);
    if (key) select(selected === key ? null : key);
  };
  const format = (value) => `${formatValue(value)}${suffix}`;
  const describe = (item) => `${item.label}, ${format(item.value)}, ${shareText(item.value / (total || 1))}${item.members ? `. Includes ${item.members.map((member) => member.label).join(", ")}` : ""}`;
  const rows = useRef([]);
  const step = (key, index, count) => ({ ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: count - 1 })[key];
  const onLegendKey = (event, index) => {
    if (event.key === "Escape" && selected) {
      event.preventDefault();
      select(null);
      return;
    }
    const next = step(event.key, index, slices.length);
    if (next === void 0) return;
    event.preventDefault();
    rows.current[(next + slices.length) % slices.length]?.focus();
  };
  const onRingKey = (event) => {
    if (!visible.length) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setPreview(null);
      if (selected) select(null);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && current) {
      event.preventDefault();
      select(selected === current ? null : current);
      return;
    }
    const index = visible.findIndex((item2) => item2.key === current);
    const next = step(event.key, index < 0 ? event.key.endsWith("Up") || event.key.endsWith("Left") ? 0 : -1 : index, visible.length);
    if (next === void 0) return;
    event.preventDefault();
    const item = visible[(next + visible.length) % visible.length];
    setPreview(item.key);
    setAnnouncement(describe(item));
  };
  const onLegendBlur = (event) => {
    if (!(event.relatedTarget instanceof Node && event.currentTarget.closest("ul")?.contains(event.relatedTarget))) setPreview(null);
  };
  const identity = activeSlice ? activeSlice.key : total ? "__total" : "__empty";
  const readouts = [{ key: "__total", label: total ? totalLabel : emptyLabel, value: total, meta: null }, ...slices.map((item) => ({ key: item.key, label: item.label, value: item.value, meta: item }))];
  const activeIndex = Math.max(0, readouts.findIndex((item) => item.key === (identity === "__empty" ? "__total" : identity)));
  const summary = total ? `${label}. ${totalLabel} ${format(total)}. ${visible.map(describe).join(". ")}.` : `${label}. ${emptyLabel}.`;
  const members = (item) => item.members ? item.members.length > 2 ? `${item.members.slice(0, 2).map((member) => member.label).join(", ")} and ${item.members.length - 2} more` : item.members.map((member) => member.label).join(" and ") : null;
  const ringLabel = `${label}. Use the arrow keys to read each segment.`;
  return <figure ref={figure} className={[styles.figure, className].filter(Boolean).join(" ")} aria-label={label} data-legend={legend || void 0}>
    <div
    className={styles.ring}
    style={{ width: size, "--inner": `${inner * 2 / size * 100}%` }}
    tabIndex={legend ? void 0 : 0}
    role={legend ? void 0 : "group"}
    aria-label={legend ? void 0 : ringLabel}
    onKeyDown={legend ? void 0 : onRingKey}
    onBlur={legend ? void 0 : () => setPreview(null)}
  >
      <svg ref={svg} className={styles.svg} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false" onPointerMove={onRingMove} onPointerLeave={() => setPreview(null)} onClick={onRingClick} data-hovering={current !== null || void 0}>
        <circle className={styles.track} cx={c} cy={c} r={(outer + inner) / 2} strokeWidth={outer - inner} data-idle={!shown || !total || void 0} />
        {drawn.map((item) => <path key={item.key} ref={registerPath} data-key={item.key} className={styles.segment} data-active={item.key === current || void 0} data-dim={current !== null && item.key !== current || void 0} style={{ "--slice": colorFor(item) }} />)}
      </svg>
      <div className={styles.center} aria-hidden="true">
        {readouts.map((item, index) => <motion.span key={item.key} className={styles.readout} initial={false} {...drum(index - activeIndex, reduced)}>
          <span className={styles.centerLabel}>{item.label}</span>
          <span className={styles.centerValue}>{item.value || item.meta ? <Count value={item.value} format={formatValue} reduced={reduced} /> : " "}</span>
          <span className={styles.centerMeta}>{item.meta ? <><Count value={total && !hidden.has(item.key) ? item.value / total : 0} format={shareText} reduced={reduced} /> of {totalLabel.toLowerCase()}</> : unit || " "}</span>
        </motion.span>)}
      </div>
    </div>
    {legend && slices.length > 0 && <ul className={styles.legend} aria-label={`${label}, segments${legendAction === "toggle" ? ". Press a segment to show or hide it" : ""}`} id={legendId} onPointerLeave={() => setPreview(null)}>
      <AnimatePresence initial={false}>{slices.map((item, index) => {
    const off = hidden.has(item.key);
    return <motion.li key={item.key} className={styles.item} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : spring.smooth}>
          <button
      ref={(node) => {
        if (node) rows.current[index] = node;
      }}
      type="button"
      className={styles.row}
      aria-pressed={legendAction === "toggle" ? !off : selected === item.key}
      aria-label={off ? `${item.label}, hidden` : describe(item)}
      data-active={item.key === current || void 0}
      data-pinned={selected === item.key || void 0}
      data-hidden={off || void 0}
      style={{ "--slice": colorFor(item) }}
      onClick={() => legendAction === "toggle" ? setHidden(item.key) : select(selected === item.key ? null : item.key)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPreview(off ? null : item.key);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) setPreview(off ? null : item.key);
      }}
      onBlur={onLegendBlur}
      onKeyDown={(event) => onLegendKey(event, index)}
    >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.rowText}>
              <span className={styles.rowLabel}>{item.label}</span>
              {item.members && <span className={styles.rowMembers}>{members(item)}</span>}
            </span>
            <span className={styles.rowValue} aria-hidden="true"><Count value={item.value} format={formatValue} reduced={reduced} /></span>
            <span className={styles.rowShare} aria-hidden="true"><Count value={off || !total ? 0 : item.value / total} format={shareText} reduced={reduced} /></span>
          </button>
        </motion.li>;
  })}</AnimatePresence>
    </ul>}
    <p className={styles.srOnly}>{summary}</p>
    <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    {total > 0 && <table className={styles.srOnly}>
      <caption>{label}</caption>
      <thead><tr><th scope="col">Segment</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead>
      <tbody>{visible.flatMap((item) => item.members ? item.members.map((member) => ({ key: member.key, label: `${member.label} (${otherLabel})`, value: member.value })) : [item]).map((item) => <tr key={item.key}><th scope="row">{item.label}</th><td>{format(item.value)}</td><td>{shareText(item.value / total)}</td></tr>)}</tbody>
    </table>}
  </figure>;
}
export default DonutChart;

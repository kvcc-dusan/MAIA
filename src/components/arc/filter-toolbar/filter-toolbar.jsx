import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "@/components/icons";
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./filter-toolbar.module.css";
const enter = { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] };
const leave = { duration: motionTokens.duration.instant, ease: [...motionTokens.ease.standard] };
const still = { duration: 0 };
const fade = { duration: motionTokens.duration.instant, ease: [...motionTokens.ease.standard] };
const blur = (px) => `blur(${px}px)`;
const clamp = (value) => Math.min(1, Math.max(0, value));
const toOption = (entry) => typeof entry === "string" ? { value: entry } : entry;
const optionText = (entry) => entry.label ?? entry.value;
const textMotion = (reduced) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, y: "0.3em", filter: blur(motionTokens.blur.soft) },
  animate: { opacity: 1, y: 0, filter: blur(0) },
  exit: reduced ? { opacity: 0, transition: still } : { opacity: 0, y: "-0.3em", filter: blur(motionTokens.blur.subtle), transition: leave },
  transition: reduced ? fade : enter
});
function MorphText({ text }) {
  const reduced = useReducedMotion() ?? false;
  const measure = useRef(null);
  const width = useMotionValue("auto");
  useLayoutEffect(() => {
    const node = measure.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let last = null;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = Math.ceil(entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth), changed = last !== null && last !== node.textContent;
      last = node.textContent;
      if (changed && !reduced) animate(width, next, motionTokens.spring.morph);
      else width.jump(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, width]);
  return <motion.span className={styles.morphText} style={{ width }}>
    <span ref={measure} className={styles.measure} aria-hidden="true">{text}</span>
    <AnimatePresence mode="popLayout" initial={false}><motion.span key={text} className={styles.morphValue} {...textMotion(reduced)}>{text}</motion.span></AnimatePresence>
  </motion.span>;
}
function useFollowHeight(list, armed, reduced) {
  const height = useMotionValue("auto");
  useLayoutEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let known = false;
    const observer = new ResizeObserver(() => {
      const next = node.offsetHeight;
      if (!known || reduced || performance.now() > armed.current) {
        known = true;
        height.jump(next);
        return;
      }
      animate(height, next, motionTokens.spring.smooth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [armed, height, list, reduced]);
  return height;
}
function useReflowGlide(list, armed, reduced) {
  useLayoutEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const tracks = /* @__PURE__ */ new Map();
    const check = () => {
      const now = performance.now();
      for (const child of Array.from(node.children)) {
        const x = child.offsetLeft, y = child.offsetTop, track = tracks.get(child);
        if (!track) {
          tracks.set(child, { x, y, dx: 0, dy: 0 });
          continue;
        }
        const jx = track.x - x, jy = track.y - y;
        track.x = x;
        track.y = y;
        if (reduced || now > armed.current || Math.abs(jy) < 1 && Math.abs(jx) < 40) continue;
        track.stop?.();
        const fromX = track.dx + jx, fromY = track.dy + jy;
        const apply = (progress) => {
          track.dx = fromX * (1 - progress);
          track.dy = fromY * (1 - progress);
          child.style.translate = progress >= 1 ? "" : `${track.dx}px ${track.dy}px`;
        };
        apply(0);
        track.stop = animate(0, 1, { ...motionTokens.spring.smooth, onUpdate: apply, onComplete: () => apply(1) }).stop;
      }
      for (const child of tracks.keys()) if (child.parentElement !== node) tracks.delete(child);
    };
    const observer = new ResizeObserver(check);
    const watch = () => {
      for (const child of Array.from(node.children)) observer.observe(child);
    };
    const mutations = new MutationObserver(() => {
      watch();
      check();
    });
    observer.observe(node);
    watch();
    mutations.observe(node, { childList: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      for (const track of tracks.values()) track.stop?.();
    };
  }, [armed, list, reduced]);
}
function describeChange(before, after) {
  const text = (filter) => filter.value ? `${filter.label}: ${filter.value}` : filter.label;
  const removed = before.filter((old) => !after.some((filter) => filter.id === old.id));
  if (!after.length && removed.length > 1) return "All filters cleared";
  const added = after.filter((filter) => !before.some((old) => old.id === filter.id));
  const changed = after.filter((filter) => before.some((old) => old.id === filter.id && old.value !== filter.value));
  return [...added.map((filter) => `Added ${text(filter)}`), ...changed.map((filter) => `${filter.label} changed to ${filter.value ?? "any"}`), ...removed.map((filter) => `Removed ${text(filter)}`)].join(". ");
}
function MenuList({ rows, labelledBy, onChoose, onBack, onLeave, radio }) {
  const reduced = useReducedMotion() ?? false;
  const present = useIsPresent();
  const list = useRef(null);
  const pointer = useRef(false);
  const typed = useRef({ text: "", at: 0 });
  const [current, setCurrent] = useState(() => Math.max(0, rows.findIndex((row) => row.checked)));
  const [highlight, setHighlight] = useState(null);
  const items = () => Array.from(list.current?.querySelectorAll("[data-row]") ?? []);
  const move = (item) => {
    const node = list.current;
    if (!item || !node) return;
    item.focus({ preventScroll: true });
    if (item.offsetTop < node.scrollTop) node.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > node.scrollTop + node.clientHeight) node.scrollTop = item.offsetTop + item.offsetHeight - node.clientHeight;
  };
  function onKeyDown(event) {
    const all = items(), index = all.indexOf(document.activeElement);
    const go = (next) => {
      event.preventDefault();
      pointer.current = false;
      move(all[next]);
    };
    if (event.key === "ArrowDown") return go(index < 0 ? 0 : (index + 1) % all.length);
    if (event.key === "ArrowUp") return go(index < 0 ? all.length - 1 : (index - 1 + all.length) % all.length);
    if (event.key === "Home") return go(0);
    if (event.key === "End") return go(all.length - 1);
    if (event.key === "ArrowRight" && index >= 0 && rows[index]?.drill) {
      event.preventDefault();
      onChoose(rows[index], true);
      return;
    }
    if (event.key === "ArrowLeft" && onBack) {
      event.preventDefault();
      onBack(true);
      return;
    }
    if (event.key.length === 1 && /\S/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = performance.now();
      typed.current = { text: now - typed.current.at < 700 ? typed.current.text + event.key.toLowerCase() : event.key.toLowerCase(), at: now };
      const order = [...all.slice(index + (typed.current.text.length > 1 ? 0 : 1)), ...all.slice(0, index + (typed.current.text.length > 1 ? 0 : 1))];
      const match = order.find((item) => (item.dataset.text ?? "").toLowerCase().startsWith(typed.current.text));
      if (match) go(all.indexOf(match));
    }
  }
  function onFocus(event) {
    const item = event.target.closest("[data-row]");
    if (!item) return;
    setCurrent(items().indexOf(item));
    const glide = pointer.current && !reduced, ring = !pointer.current && item.matches(":focus-visible");
    setHighlight((previous) => ({ top: item.offsetTop, height: item.offsetHeight, glide: glide && !!previous?.shown, ring, shown: true }));
  }
  function onBlur(event) {
    if (!list.current?.contains(event.relatedTarget)) setHighlight((previous) => previous && { ...previous, glide: false, ring: false, shown: false });
  }
  return <div
    ref={list}
    className={styles.list}
    role="menu"
    aria-labelledby={labelledBy}
    data-current={present ? "" : void 0}
    onKeyDown={onKeyDown}
    onFocus={onFocus}
    onBlur={onBlur}
    onPointerLeave={() => {
      if (pointer.current && list.current?.contains(document.activeElement)) onLeave();
    }}
  >
    <motion.span
    className={styles.highlight}
    data-ring={highlight?.ring || void 0}
    aria-hidden="true"
    initial={false}
    animate={highlight ? { y: highlight.top, height: highlight.height, opacity: highlight.shown ? 1 : 0 } : { opacity: 0 }}
    transition={{ default: highlight?.glide ? motionTokens.spring.snappy : still, opacity: { duration: reduced ? 0 : 0.08 } }}
  />
    {rows.map((row, index) => <button
    key={row.key}
    type="button"
    className={styles.item}
    role={radio ? "menuitemradio" : "menuitem"}
    aria-checked={radio ? !!row.checked : void 0}
    tabIndex={index === current ? 0 : -1}
    data-row={row.key}
    data-text={row.label}
    onPointerMove={(event) => {
      pointer.current = true;
      if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
    }}
    onClick={(event) => onChoose(row, event.detail === 0)}
  >
      {row.icon ? <span className={styles.itemIcon} aria-hidden="true">{row.icon}</span> : null}
      <span className={styles.itemLabel}>{row.label}</span>
      {row.meta ? <span className={styles.itemMeta}>{row.meta}</span> : null}
    </button>)}
  </div>;
}
function roomFor(node) {
  const room = { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: window.innerHeight };
  for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const box = parent.getBoundingClientRect();
    if (style.overflowX !== "visible") {
      room.left = Math.max(room.left, box.left);
      room.right = Math.min(room.right, box.right);
    }
    if (style.overflowY !== "visible") {
      room.top = Math.max(room.top, box.top);
      room.bottom = Math.min(room.bottom, box.bottom);
    }
  }
  return room;
}
export function FilterMenu({ fields, onSelect, active = [], label = "Add filter", align = "end" }) {
  const reduced = useReducedMotion() ?? false;
  const id = useId(), panelId = `${id}panel`, titleId = `${id}title`;
  const root = useRef(null), trigger = useRef(null), panel = useRef(null);
  const phaseRef = useRef("closed"), run = useRef(0), focusNext = useRef(null);
  const [phase, setPhase] = useState("closed");
  const [fieldId, setFieldId] = useState(null);
  const [direction, setDirection] = useState(1);
  const [up, setUp] = useState(false);
  const [origin, setOrigin] = useState("100% 0");
  const width = useMotionValue("100%"), height = useMotionValue("100%");
  const left = useMotionValue(0), target = useMotionValue(0);
  const panelX = useTransform(() => target.get() - left.get());
  const from = useMotionValue(0), to = useMotionValue(0);
  const progress = useTransform(() => {
    const now = width.get(), start = from.get(), end = to.get();
    return typeof now !== "number" ? 0 : end > start ? clamp((now - start) / (end - start)) : 1;
  });
  const faceOut = useTransform(() => clamp(progress.get() / 0.35)), contentIn = useTransform(() => clamp((progress.get() - 0.4) / 0.5));
  const faceStyle = { opacity: useTransform(() => 1 - faceOut.get()), scale: useTransform(() => 1 - faceOut.get() * 0.04), filter: useTransform(() => faceOut.get() ? blur(faceOut.get() * motionTokens.blur.subtle) : "none") };
  const contentStyle = { opacity: contentIn, transformOrigin: origin, scale: useTransform(() => 0.96 + contentIn.get() * 0.04), y: useTransform(() => (1 - contentIn.get()) * (up ? -6 : 6)), filter: useTransform(() => contentIn.get() === 1 ? "none" : blur((1 - contentIn.get()) * motionTokens.blur.soft)) };
  const open = phase === "open", field = fields.find((entry) => entry.id === fieldId) ?? null;
  const openMenu = useCallback((focus) => {
    const button = trigger.current, content = panel.current;
    if (!button || !content) return;
    const rect = button.getBoundingClientRect(), panelWidth = content.offsetWidth + 2, panelHeight = content.offsetHeight + 2;
    const room = roomFor(root.current ?? button), gutter = 16;
    const min = room.left + gutter - rect.left, max = room.right - gutter - rect.left - panelWidth, end = rect.width - panelWidth;
    let x = align === "end" ? end >= min ? end : 0 <= max ? 0 : end : 0 <= max ? 0 : end >= min ? end : 0;
    x = Math.round(Math.min(Math.max(x, min), Math.max(min, max)));
    const below = room.bottom - rect.top, above = rect.bottom - room.top;
    const nextUp = below < panelHeight + gutter && above > below;
    if (phaseRef.current === "closed") {
      width.jump(rect.width);
      height.jump(rect.height);
      left.jump(0);
    }
    target.jump(x);
    from.jump(rect.width);
    to.jump(panelWidth);
    phaseRef.current = "open";
    run.current += 1;
    focusNext.current = focus;
    setPhase("open");
    setUp(nextUp);
    setFieldId(null);
    setDirection(-1);
    setOrigin(`${Math.round(rect.width / 2 - x)}px ${nextUp ? "100%" : "0"}`);
    const transition = reduced ? still : motionTokens.spring.morph;
    animate(left, x, transition);
    animate(width, panelWidth, transition);
    animate(height, panelHeight, transition);
  }, [align, from, height, left, reduced, target, to, width]);
  const closeMenu = useCallback((restore) => {
    const button = trigger.current;
    if (phaseRef.current !== "open" || !button) return;
    phaseRef.current = "closing";
    const token = run.current += 1;
    setPhase("closing");
    if (restore) button.focus({ preventScroll: true, focusVisible: restore === "keyboard" });
    const transition = reduced ? still : motionTokens.spring.snappy;
    animate(left, 0, transition);
    const rect = button.getBoundingClientRect();
    animate(height, rect.height, transition);
    animate(width, rect.width, { ...transition, onComplete: () => {
      if (token !== run.current) return;
      phaseRef.current = "closed";
      width.jump("100%");
      height.jump("100%");
      setPhase("closed");
      setFieldId(null);
    } });
  }, [height, left, reduced, width]);
  useLayoutEffect(() => {
    const content = panel.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (phaseRef.current !== "open") return;
      animate(height, content.offsetHeight + 2, reduced ? still : motionTokens.spring.smooth);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [height, reduced]);
  useLayoutEffect(() => {
    const request = focusNext.current, content = panel.current;
    if (!request || !content || phase !== "open") return;
    focusNext.current = null;
    if (request === "panel") {
      content.focus({ preventScroll: true });
      return;
    }
    const items = Array.from(content.querySelectorAll("[data-current] [data-row]"));
    const next = request === "first" ? items[0] : request === "last" ? items.at(-1) : request === "checked" ? items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0] : items.find((item) => item.dataset.row === request.key) ?? items[0];
    next?.focus({ preventScroll: true });
  }, [phase, fieldId]);
  useEffect(() => {
    if (phase !== "open") return;
    const onPointerDown = (event) => {
      const node = root.current, hit = event.target;
      if (!node || hit && node.contains(hit)) return;
      closeMenu(false);
      if (!hit?.closest?.("button, a[href], input, select, textarea, [tabindex], [contenteditable]")) window.setTimeout(() => {
        const focused = document.activeElement;
        if (!focused || focused === document.body || node.contains(focused)) trigger.current?.focus({ preventScroll: true, focusVisible: false });
      }, 0);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [closeMenu, phase]);
  function onPanelKeyDown(event) {
    if (event.defaultPrevented) return;
    const items = Array.from(panel.current?.querySelectorAll("[data-current] [data-row]") ?? []);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      (event.key === "ArrowDown" ? items[0] : items.at(-1))?.focus({ preventScroll: true });
    }
    if (event.key === "ArrowLeft" && field) {
      event.preventDefault();
      goBack(true);
    }
  }
  function goBack(keyboard) {
    if (!field) return;
    focusNext.current = keyboard ? { key: field.id } : "panel";
    setDirection(-1);
    setFieldId(null);
  }
  function chooseField(row, keyboard) {
    focusNext.current = keyboard ? "checked" : "panel";
    setDirection(1);
    setFieldId(row.key);
  }
  function chooseValue(row, keyboard) {
    if (!field) return;
    onSelect({ id: field.id, label: field.label, value: row.label }, field);
    closeMenu(keyboard ? "keyboard" : "pointer");
  }
  const current = (entry) => active.find((filter) => filter.id === entry.id)?.value;
  const fieldRows = fields.map((entry) => ({
    key: entry.id,
    label: entry.label,
    icon: entry.icon,
    drill: true,
    meta: <>{current(entry) ? <span className={styles.metaValue}>{current(entry)}</span> : null}<ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" /></>
  }));
  const valueRows = field ? field.options.map(toOption).map((entry) => {
    const text = optionText(entry), checked = current(field) === text;
    return { key: entry.value, label: text, icon: entry.icon, checked, meta: entry.hint != null || checked ? <>{entry.hint != null ? <span className={styles.hint}>{entry.hint}</span> : null}<span className={styles.check} data-on={checked || void 0}><Check size={15} strokeWidth={2} aria-hidden="true" /></span></> : null };
  }) : [];
  const step = {
    enter: (dir) => reduced ? { opacity: 0 } : { opacity: 0, x: dir * 18, filter: blur(motionTokens.blur.soft) },
    center: { opacity: 1, x: 0, filter: blur(0), transition: reduced ? fade : { ...enter, x: motionTokens.spring.smooth } },
    exit: (dir) => reduced ? { opacity: 0, transition: still } : { opacity: 0, x: dir * -18, filter: blur(motionTokens.blur.subtle), transition: leave }
  };
  return <div
    ref={root}
    className={styles.menu}
    data-state={phase}
    data-y={up ? "up" : "down"}
    onKeyDown={(event) => {
      if (event.key === "Escape" && phaseRef.current === "open") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu("keyboard");
      }
    }}
    onBlur={(event) => {
      const next = event.relatedTarget;
      if (phaseRef.current === "open" && next && !root.current?.contains(next)) closeMenu(false);
    }}
  >
    <button
    ref={trigger}
    type="button"
    className={styles.trigger}
    data-filter-trigger=""
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls={panelId}
    tabIndex={open ? -1 : void 0}
    onClick={(event) => {
      if (phaseRef.current !== "open") openMenu(event.detail === 0 ? "first" : "panel");
    }}
    onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowDown" ? "first" : "last");
      }
    }}
  >
      <motion.span className={styles.face} style={faceStyle}>
        <Plus size={15} strokeWidth={1.8} aria-hidden="true" />{label}
      </motion.span>
    </button>
    <motion.div className={styles.surface} style={{ left, width, height }}>
      <motion.div ref={panel} id={panelId} className={styles.panel} role="dialog" aria-labelledby={titleId} tabIndex={-1} inert={!open} style={{ x: panelX }} onKeyDown={onPanelKeyDown}>
        <motion.div style={contentStyle}>
          <div className={styles.head}>
            <AnimatePresence initial={false}>
              {field ? <motion.button
    key="back"
    type="button"
    className={styles.back}
    aria-label="Back to fields"
    onClick={(event) => goBack(event.detail === 0)}
    initial={reduced ? { opacity: 0, width: 28, marginRight: 2 } : { opacity: 0, width: 0, marginRight: 0, scale: 0.6 }}
    animate={{ opacity: 1, width: 28, marginRight: 2, scale: 1 }}
    exit={reduced ? { opacity: 0, transition: still } : { opacity: 0, width: 0, marginRight: 0, scale: 0.6, transition: { ...motionTokens.spring.snappy, opacity: leave } }}
    transition={reduced ? fade : { ...motionTokens.spring.snappy, opacity: enter }}
  ><ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" /></motion.button> : null}
            </AnimatePresence>
            <span className={styles.title} id={titleId}>
              <AnimatePresence mode="popLayout" initial={false}><motion.span key={field?.id ?? "fields"} className={styles.titleText} {...textMotion(reduced)}>{field ? field.label : label}</motion.span></AnimatePresence>
            </span>
          </div>
          <div className={styles.stage}>
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div key={field?.id ?? "fields"} className={styles.step} custom={direction} variants={step} initial="enter" animate="center" exit="exit">
                {field ? <MenuList rows={valueRows} labelledBy={titleId} radio onChoose={chooseValue} onBack={goBack} onLeave={() => panel.current?.focus({ preventScroll: true })} /> : <MenuList rows={fieldRows} labelledBy={titleId} onChoose={chooseField} onLeave={() => panel.current?.focus({ preventScroll: true })} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  </div>;
}
export function FilterToolbar({ filters, onRemove, onClearAll, children, label = "Active filters", addFilter }) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef(null), list = useRef(null);
  const armed = useRef(0), pendingFocus = useRef(null);
  const [seen, setSeen] = useState(filters);
  const [message, setMessage] = useState("");
  if (seen !== filters) {
    setSeen(filters);
    const next = describeChange(seen, filters);
    if (next) setMessage(next);
  }
  const signature = filters.map((filter) => `${filter.id}:${filter.value ?? ""}`).join("|");
  useLayoutEffect(() => {
    armed.current = performance.now() + 900;
  }, [signature]);
  const frameHeight = useFollowHeight(list, armed, reduced);
  useReflowGlide(list, armed, reduced);
  useLayoutEffect(() => {
    const index = pendingFocus.current, node = root.current;
    if (index === null || !node) return;
    pendingFocus.current = null;
    const next = filters[Math.min(index, filters.length - 1)];
    const target = next ? node.querySelector(`[data-chip-remove="${CSS.escape(next.id)}"]`) : node.querySelector("[data-filter-trigger]");
    target?.focus({ preventScroll: true });
  }, [filters]);
  const still2 = { duration: 0 };
  const slot = (gap) => ({
    initial: reduced ? false : { width: 0, marginRight: -gap, overflow: "clip", "--slot-moving": 1 },
    animate: { width: "auto", marginRight: 0, transitionEnd: { overflow: "visible", "--slot-moving": 0 } },
    exit: reduced ? { opacity: 0, transition: still2 } : { width: 0, marginRight: -gap, overflow: "clip", "--slot-moving": 1, pointerEvents: "none", transition: { ...motionTokens.spring.smooth, "--slot-moving": still2 } },
    transition: reduced ? still2 : motionTokens.spring.smooth
  });
  const chip = {
    initial: reduced ? false : { opacity: 0, scale: 0.9, filter: blur(motionTokens.blur.soft) },
    animate: { opacity: 1, scale: 1, filter: blur(0) },
    exit: reduced ? { opacity: 0, transition: still2 } : { opacity: 0, scale: 0.9, filter: blur(motionTokens.blur.subtle), transition: leave },
    transition: reduced ? still2 : { ...enter, scale: motionTokens.spring.snappy }
  };
  const text = reduced ? { ...textMotion(true), initial: false } : textMotion(false);
  const emptyText = reduced ? text : { ...text, transition: { ...enter, delay: motionTokens.duration.instant * 0.75 } };
  return <div ref={root} className={styles.toolbar} role="group" aria-label={label}>
    <motion.div className={styles.frame} style={{ height: frameHeight }}>
      <div ref={list} className={styles.chips}>
        <AnimatePresence initial={false}>
          {filters.map((filter, index) => <motion.span className={styles.slot} key={filter.id} {...slot(8)}><motion.span className={styles.chip} {...chip}><span className={styles.chipLabel}>{filter.label}{filter.value ? <span className={styles.value}><span className={styles.separator}> · </span><MorphText text={filter.value} /></span> : null}</span><button type="button" data-chip-remove={filter.id} aria-label={`Remove ${filter.label}${filter.value ? `: ${filter.value}` : ""}`} onClick={(event) => {
    if (document.activeElement === event.currentTarget) pendingFocus.current = index;
    onRemove(filter.id);
  }}><X size={14} strokeWidth={1.8} aria-hidden="true" /></button></motion.span></motion.span>)}
        </AnimatePresence>
        {
    /* The empty note sits over the leading edge instead of in the flow, so it fades in where the chips were rather than riding their collapsing slots across the row. */
  }
        <AnimatePresence initial={false}>
          {filters.length ? null : <motion.span key="empty" className={styles.empty} {...emptyText}>No filters applied</motion.span>}
        </AnimatePresence>
      </div>
    </motion.div>
    <div className={styles.actions}>
      {addFilter ? <FilterMenu fields={addFilter.fields} onSelect={addFilter.onAdd} active={filters} label={addFilter.label} align={addFilter.align} /> : null}
      {children}
      <AnimatePresence initial={false}>
        {filters.length > 0 ? <motion.span key="clear" className={styles.slot} {...slot(12)}><button className={styles.clear} type="button" onClick={() => {
    pendingFocus.current = -1;
    onClearAll?.();
  }}><motion.span className={styles.clearText} {...text}>Clear all</motion.span></button></motion.span> : null}
      </AnimatePresence>
    </div>
    <span className={styles.srOnly} role="status">{message}</span>
  </div>;
}
export default FilterToolbar;

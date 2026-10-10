import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildTicks, containsDay, dayCenterPercent, dayLeftPercent, dayString, layoutLane, pxPerDayFor } from "./geometry";
import { useElementWidth } from "./useElementWidth";
import { nextFocusId, resolveActiveId } from "./navigation";
import { STATUS_LABELS, UNASSIGNED_LANE_ID, workstreamStatusLabel } from "./roadmapModel";
import GanttItem from "./GanttItem";
import WorkstreamMenu from "./WorkstreamMenu";
import styles from "./RoadmapGantt.module.css";

// A click on empty track starts a milestone this long, as in the hub.
const NEW_SPAN_DAYS = 14;
const NAV_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hand-built Gantt (Arc has no item for it): workstream lanes down, a day axis
 * across, scrolling sideways inside its own frame with the lane labels pinned.
 * Items form one roving-tabindex group: one Tab stop, arrows move between them.
 * `ref` exposes scrollToToday() for the page's Today button.
 */
export default function RoadmapGantt({
  ref, lanes, range, zoom, today, targetDay, referenceYear,
  onOpenMilestone, onEditWorkstream, onDeleteWorkstream, onAddAt,
}) {
  const scrollerRef = useRef(null);
  const axisRef = useRef(null);
  const trackWidth = useElementWidth(axisRef);
  const [focusedId, setFocusedId] = useState(null);

  const ticks = useMemo(() => buildTicks(range, zoom), [range, zoom]);
  const zoomPx = pxPerDayFor(zoom);
  const pxPerDay = trackWidth > 0 ? trackWidth / range.days : zoomPx;

  const laid = useMemo(
    () => lanes.map((lane) => layoutLane(
      lane.milestones.map((m) => ({ ...m, statusText: STATUS_LABELS[m.status] })),
      range,
      pxPerDay
    )),
    [lanes, range, pxPerDay]
  );
  const navLanes = useMemo(() => laid.map((l) => l.items), [laid]);
  const activeId = resolveActiveId(navLanes, focusedId);

  const showToday = containsDay(range, today);
  const showTarget = containsDay(range, targetDay);
  const todayFirst = targetDay === null || today <= targetDay;

  const scrollToToday = useCallback((smooth) => {
    const scroller = scrollerRef.current;
    if (!scroller || !containsDay(range, today)) return;
    const labelWidth = scroller.querySelector("[data-roadmap-corner]")?.offsetWidth ?? 0;
    const x = (dayCenterPercent(today, range) / 100) * (axisRef.current?.offsetWidth ?? 0);
    scroller.scrollTo({
      left: Math.max(0, x - (scroller.clientWidth - labelWidth) / 3),
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
    });
  }, [range, today]);

  useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday]);

  // Open on today, once the axis has a width to scroll against.
  const hasScrolled = useRef(false);
  useLayoutEffect(() => {
    if (trackWidth > 0 && !hasScrolled.current) {
      hasScrolled.current = true;
      scrollToToday(false);
    }
  }, [trackWidth, scrollToToday]);

  // A zoom change keeps the same date at the left edge instead of jumping.
  const leftDayRef = useRef(null);
  const lastZoom = useRef(zoom);
  const handleScroll = (event) => {
    const axisWidth = axisRef.current?.offsetWidth ?? 0;
    if (event.currentTarget.clientWidth && axisWidth) {
      leftDayRef.current = event.currentTarget.scrollLeft / (axisWidth / range.days);
    }
  };
  useLayoutEffect(() => {
    if (lastZoom.current === zoom) return;
    lastZoom.current = zoom;
    const axisWidth = axisRef.current?.offsetWidth ?? 0;
    if (leftDayRef.current !== null && axisWidth && scrollerRef.current) {
      scrollerRef.current.scrollLeft = leftDayRef.current * (axisWidth / range.days);
    }
  }, [zoom, range.days]);

  const handleTrackClick = (event, lane) => {
    if (event.target !== event.currentTarget || !onAddAt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const day = Math.floor(((event.clientX - rect.left) / rect.width) * range.days) + range.start;
    onAddAt({
      workstreamId: lane.id === UNASSIGNED_LANE_ID ? null : lane.id,
      start: dayString(day),
      date: dayString(day + NEW_SPAN_DAYS),
    });
  };

  const handleKeyDown = (event) => {
    if (!NAV_KEYS.includes(event.key)) return;
    const next = nextFocusId(navLanes, event.currentTarget.dataset.roadmapItem, event.key);
    event.preventDefault();
    if (!next) return;
    setFocusedId(next);
    scrollerRef.current?.querySelector(`[data-roadmap-item="${CSS.escape(next)}"]`)?.focus();
  };

  useEffect(() => {
    if (focusedId && !navLanes.flat().some((i) => i.id === focusedId)) setFocusedId(null);
  }, [focusedId, navLanes]);

  const laneCount = lanes.length;
  const pct = (day) => `${dayLeftPercent(day, range)}%`;

  return (
    <div className={styles.root}>
      <div className={styles.frame}>
        <div ref={scrollerRef} className={styles.scroller} onScroll={handleScroll}>
          <div
            className={styles.chart}
            data-zoom={zoom}
            style={{ "--days": range.days, "--ppd": `${zoomPx}px`, gridTemplateRows: `var(--roadmap-axis-h) repeat(${laneCount}, auto)` }}
            role="group"
            aria-label="Milestone timeline"
          >
            <div className={styles.corner} data-roadmap-corner aria-hidden="true" />
            <div ref={axisRef} className={styles.axis} aria-hidden="true">
              {ticks.quarters.length > 0 && (
                <div className={styles.quarters}>
                  {ticks.quarters.map((q) => (
                    <span
                      key={q.key}
                      className={styles.quarter}
                      style={{ left: pct(q.startDay), width: `${((q.endDay - q.startDay + 1) / range.days) * 100}%` }}
                    >
                      {q.label}
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.months}>
                {ticks.months.map((m) => (
                  <span
                    key={m.key}
                    className={styles.month}
                    style={{ left: pct(m.startDay), width: `${((m.endDay - m.startDay + 1) / range.days) * 100}%` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              {ticks.showWeeks && (
                <div className={styles.weeks}>
                  {ticks.weeks.map((w) => (
                    <span key={w.day} className={styles.week} style={{ left: pct(w.day) }}>{w.label}</span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.overlay} style={{ gridRow: `1 / span ${laneCount + 1}` }} aria-hidden="true">
              {ticks.weekends.map((day) => (
                <i key={`we-${day}`} className={styles.weekend} style={{ left: pct(day), width: `${100 / range.days}%` }} />
              ))}
              {ticks.lines.map((l) => (
                <i key={`${l.kind}-${l.day}`} className={styles.line} data-kind={l.kind} style={{ left: pct(l.day) }} />
              ))}
              {showTarget && (
                <>
                  <i className={styles.marker} data-kind="target" style={{ left: `${dayCenterPercent(targetDay, range)}%` }} />
                  <span className={styles.flag} data-kind="target" data-side={todayFirst ? "start" : "end"} style={{ left: `${dayCenterPercent(targetDay, range)}%` }}>Target</span>
                </>
              )}
              {showToday && (
                <>
                  <i className={styles.marker} data-kind="today" style={{ left: `${dayCenterPercent(today, range)}%` }} />
                  <span className={styles.flag} data-kind="today" data-side={todayFirst ? "end" : "start"} style={{ left: `${dayCenterPercent(today, range)}%` }}>Today</span>
                </>
              )}
            </div>

            {lanes.map((lane, index) => {
              const { items, rowCount } = laid[index];
              const labelId = `roadmap-lane-${lane.id}`;
              const row = index + 2;
              return (
                <React.Fragment key={lane.id}>
                  <div className={styles.laneLabel} style={{ gridRow: row, gridColumn: 1 }}>
                    <span className={styles.swatch} style={{ background: lane.color }} aria-hidden="true" />
                    <div className={styles.laneText}>
                      <span id={labelId} className={styles.laneName} title={lane.name}>{lane.name}</span>
                      {(lane.owner || (lane.status && lane.status !== "active")) && (
                        <span className={styles.laneMeta}>
                          {[lane.owner, lane.status && lane.status !== "active" ? workstreamStatusLabel(lane.status) : ""].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                    {lane.id !== UNASSIGNED_LANE_ID && (
                      <WorkstreamMenu workstream={lane.workstream} onEdit={onEditWorkstream} onDelete={onDeleteWorkstream} />
                    )}
                  </div>
                  <div
                    className={styles.track}
                    style={{ gridRow: row, gridColumn: 2, "--rows": rowCount }}
                    data-addable={onAddAt ? "" : undefined}
                    role="group"
                    aria-labelledby={labelId}
                    onClick={(event) => handleTrackClick(event, lane)}
                  >
                    {items.length === 0 && <span className={styles.empty}>No dated milestones</span>}
                    {items.map((item) => (
                      <GanttItem
                        key={item.id}
                        item={item}
                        isActive={item.id === activeId}
                        referenceYear={referenceYear}
                        onOpen={onOpenMilestone}
                        onFocusItem={setFocusedId}
                        onKeyDown={handleKeyDown}
                      />
                    ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

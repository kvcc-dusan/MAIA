import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPastTime, hasOverlap, sameDay, formatTime, formatHourLabel } from "../../../lib/time";
import { SessionColorSwatches } from "./SessionColorSwatches";
import { SESSION_COLOR_VARS } from "./sessionColorVars";
import { Menu } from "@/components/composed/Menu";
import { Pen01, Delete01 } from "@/components/ui/CustomIcon.jsx";
import styles from "./DailyTimeline.module.css";

const SLOT_HEIGHT = 40;

const GridSlot = memo(({
  i,
  isHourStart,
  label,
  isPast,
  isOccupied,
  onMouseDown,
  onMouseEnter,
  onDoubleClick
}) => {
  return (
    <div
      id={isHourStart ? `timeline-hour-${Math.floor(i / 2)}` : undefined}
      className={styles.slot}
    >
      <div className={cn(styles.hour, !isHourStart && styles.hourHalf)}>
        {isHourStart && label}
      </div>

      <div
        className={cn(
          styles.cellSlot,
          isHourStart && styles.cellHour,
          isPast ? styles.cellPast : isOccupied && styles.cellOccupied
        )}
        onMouseDown={() => onMouseDown(i)}
        onMouseEnter={() => onMouseEnter(i)}
        onDoubleClick={() => onDoubleClick(i)}
      />
    </div>
  );
});

const SessionItem = memo(({
  session,
  top,
  height,
  isShort,
  isDragging,
  onDoubleClick,
  onMouseDownMove,
  onMouseDownResize,
}) => {
  const start = new Date(session.start);
  const end = new Date(session.end);

  const timeRange = `${formatTime(start)} to ${formatTime(end)}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${session.title}, ${timeRange}. Press Enter to edit.`}
      className={cn(
        styles.block,
        isShort ? styles.blockShort : styles.blockTall,
        isDragging && styles.blockDragging
      )}
      style={{
        top: `${top}px`,
        height: `${height - 1}px`,
        "--session-color": SESSION_COLOR_VARS[session.color] ?? SESSION_COLOR_VARS.neutral,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(session);
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Enter") {
          e.preventDefault();
          onDoubleClick(session);
        }
      }}
      onMouseDown={(e) => onMouseDownMove(e, session)}
    >
      <div className={styles.blockTitle}>{session.title}</div>
      {!isShort && session.description && <div className={styles.blockDesc}>{session.description}</div>}
      <div className={cn(styles.blockTime, isShort ? styles.blockTimeShort : styles.blockTimeTall)}>{timeRange}</div>
      <div className={styles.resize} aria-hidden="true" onMouseDown={(e) => onMouseDownResize(e, session)} />
    </div>
  );
});

/**
 * Session block plus its right-click / long-press menu.
 *
 * Base UI's ContextMenuTrigger provides right-click AND long-press-on-touch
 * out of the box — the old code hand-rolled both (a `longPressRef` timer plus
 * three touch handlers, and a duplicated viewport-clamp calculation also found
 * in ExecutionPanel and ProjectsPage). `display: contents` on the trigger
 * keeps it out of the box model entirely, so SessionItem's absolute
 * positioning is untouched by the extra wrapping element.
 */
const SessionWithMenu = memo(({ session, onEdit, onDelete, onColorChange, ...itemProps }) => {
  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <SessionItem session={session} {...itemProps} />
      </Menu.ContextTrigger>
      <Menu.ContextContent>
        <Menu.ContextLabel>Session</Menu.ContextLabel>
        <div className={styles.menuSwatches}>
          <SessionColorSwatches value={session.color} onChange={(color) => onColorChange(session.id, color)} />
        </div>
        <Menu.ContextSeparator />
        <Menu.ContextItem onClick={() => onEdit(session)}>
          <Pen01 size={14} className={styles.menuIcon} />
          Edit session
        </Menu.ContextItem>
        <Menu.ContextItem variant="destructive" onClick={() => onDelete(session.id)}>
          <Delete01 size={14} className={styles.menuIcon} />
          Delete session
        </Menu.ContextItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
});

function DailyTimeline({
  sessions,
  setSessions,
  selectedDate,
  onOpenSessionForm,
}) {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [dragSession, setDragSession] = useState(null);

  const [gridDraft, setGridDraft] = useState(null);

  const scrollContainerRef = useRef(null);

  // Minute ticker for the now-indicator.
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to next available slot (today) or 8 AM (other dates)
  useEffect(() => {
    if (!selectedDate || !scrollContainerRef.current) return;

    const now = new Date();
    const isToday = sameDay(selectedDate, now);

    let targetSlot;
    if (isToday) {
      const totalMins = now.getHours() * 60 + now.getMinutes();
      targetSlot = Math.ceil(totalMins / 30);
    } else {
      targetSlot = 16; // 8:00 AM
    }

    scrollContainerRef.current.scrollTop = Math.max(0, (targetSlot - 1) * SLOT_HEIGHT);
  }, [selectedDate]);

  const getSlotDate = useCallback((i) => {
    const d = new Date(selectedDate);
    d.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
    return d;
  }, [selectedDate]);

  const openForm = useCallback((draft) => {
    setGridDraft(null);
    onOpenSessionForm(draft);
  }, [onOpenSessionForm]);

  const handleSlotDown = useCallback((i) => {
    const d = getSlotDate(i);
    if (isPastTime(d)) return;

    const slotEnd = new Date(d.getTime() + 30 * 60000);
    if (hasOverlap(d, slotEnd, sessions)) return;

    setGridDraft(null);
    setIsDragging(true);
    setDragMode('create');
    setDragStart(d);
    setDragCurrent(d);
  }, [getSlotDate, sessions]);

  const handleSlotEnter = useCallback((i) => {
    if (isDragging) {
      setDragCurrent(getSlotDate(i));
    }
  }, [isDragging, getSlotDate]);

  const handleSessionMouseDown = useCallback((e, s, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    setDragSession(s);
    setDragStart(new Date(s.start));
    setDragCurrent(new Date(s.start));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const current = dragCurrent || dragStart;

    if (dragMode === 'create' && dragStart) {
      const start = new Date(Math.min(dragStart, current));
      const end = new Date(Math.max(dragStart, current) + 30 * 60000);

      if (isPastTime(start) || hasOverlap(start, end, sessions)) {
        setDragStart(null);
        setDragCurrent(null);
        setDragMode(null);
        return;
      }

      setGridDraft({ start, end });
      openForm({ id: null, title: "", description: "", start, end, linkedProjectId: "none", color: "neutral" });

    } else if (dragMode === 'move' && dragSession) {
      const start = new Date(current);
      const duration = new Date(dragSession.end) - new Date(dragSession.start);
      const end = new Date(start.getTime() + duration);

      if (dragSession.id === 'draft') {
        setGridDraft({ start, end });
      } else {
        // Moving used to skip the checks `create` applies, so a session could
        // be dragged into the past or on top of another one.
        if (isPastTime(start)) {
          toast.error("Cannot move a session into the past");
        } else if (hasOverlap(start, end, sessions, dragSession.id)) {
          toast.error("That time slot is already occupied");
        } else {
          const updated = { ...dragSession, start: start.toISOString(), end: end.toISOString() };
          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
        }
      }
    } else if (dragMode === 'resize' && dragSession) {
      const start = new Date(dragSession.start);
      let newEnd = new Date(current.getTime() + 30 * 60000);
      if (newEnd <= start) newEnd = new Date(start.getTime() + 30 * 60000);

      if (dragSession.id === 'draft') {
        setGridDraft({ start, end: newEnd });
      } else if (hasOverlap(start, newEnd, sessions, dragSession.id)) {
        toast.error("That time slot is already occupied");
      } else {
        const updated = { ...dragSession, end: newEnd.toISOString() };
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
    }

    setDragStart(null);
    setDragCurrent(null);
    setDragMode(null);
    setDragSession(null);
  }, [isDragging, dragMode, dragStart, dragCurrent, dragSession, sessions, setSessions, openForm]);

  const slots = useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);

  const daySessions = useMemo(() => sessions.filter(s => {
    const d = new Date(s.start);
    return sameDay(d, selectedDate);
  }), [sessions, selectedDate]);

  const onSlotDouble = useCallback((i) => {
    const slotDate = getSlotDate(i);
    const slotEnd = new Date(slotDate.getTime() + 60 * 60000);
    if (isPastTime(slotDate) || hasOverlap(slotDate, slotEnd, sessions)) return;

    setGridDraft({ start: slotDate, end: slotEnd });
    openForm({ id: null, title: "", description: "", start: slotDate, end: slotEnd, linkedProjectId: "none", color: "neutral" });
  }, [sessions, getSlotDate, openForm]);

  const onSessionDouble = useCallback((s) => {
    openForm({
      id: s.id,
      title: s.title,
      description: s.description || "",
      start: new Date(s.start),
      end: new Date(s.end),
      linkedProjectId: s.linkedProjectId || "none",
      color: s.color || "neutral",
    });
  }, [openForm]);

  const onSessionEdit = useCallback((s) => onSessionDouble(s), [onSessionDouble]);
  const onSessionDelete = useCallback((id) => setSessions(prev => prev.filter(s => s.id !== id)), [setSessions]);
  const onSessionColorChange = useCallback((id, color) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, color } : s));
  }, [setSessions]);

  const onSessionMove = useCallback((e, s) => handleSessionMouseDown(e, s, 'move'), [handleSessionMouseDown]);
  const onSessionResize = useCallback((e, s) => handleSessionMouseDown(e, s, 'resize'), [handleSessionMouseDown]);

  // Touch handlers for creating sessions on the grid (unrelated to the
  // session context menu, which gets touch support for free from Base UI)
  const getSlotFromY = useCallback((clientY) => {
    if (!scrollContainerRef.current) return 0;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollTop = scrollContainerRef.current.scrollTop;
    const y = clientY - rect.top + scrollTop;
    return Math.max(0, Math.min(47, Math.floor(y / SLOT_HEIGHT)));
  }, []);

  const handleGridTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const i = getSlotFromY(touch.clientY);
    const d = getSlotDate(i);
    if (isPastTime(d)) return;

    const slotEnd = new Date(d.getTime() + 30 * 60000);
    if (hasOverlap(d, slotEnd, sessions)) return;

    e.preventDefault();
    setGridDraft(null);
    setIsDragging(true);
    setDragMode('create');
    setDragStart(d);
    setDragCurrent(d);
  }, [getSlotFromY, getSlotDate, sessions]);

  const handleGridTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const i = getSlotFromY(touch.clientY);
    setDragCurrent(getSlotDate(i));
  }, [isDragging, getSlotFromY, getSlotDate]);

  const handleGridTouchEnd = useCallback(() => {
    if (isDragging) handleMouseUp();
  }, [isDragging, handleMouseUp]);

  if (!selectedDate) {
    return (
      <div className={styles.placeholder}>Pick a day on the calendar to see its sessions.</div>
    );
  }

  return (
    <div className={cn(styles.scroller, "custom-scrollbar")} ref={scrollContainerRef}>
      <div
        className={styles.surface}
        style={isDragging ? { touchAction: 'none' } : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isDragging && handleMouseUp()}
        onTouchStart={handleGridTouchStart}
        onTouchMove={handleGridTouchMove}
        onTouchEnd={handleGridTouchEnd}
      >
        {slots.map((i) => {
          const slotDate = getSlotDate(i);
          const hour = Math.floor(i / 2);
          const isHourStart = i % 2 === 0;
          const label = formatHourLabel(hour);

          const slotEnd = new Date(slotDate.getTime() + 30 * 60000);
          const isPast = isPastTime(slotDate);
          const isOccupied = hasOverlap(slotDate, slotEnd, sessions);

          return (
            <GridSlot
              key={i}
              i={i}
              isHourStart={isHourStart}
              label={label}
              isPast={isPast}
              isOccupied={isOccupied}
              onMouseDown={handleSlotDown}
              onMouseEnter={handleSlotEnter}
              onDoubleClick={onSlotDouble}
            />
          )
        })}

        {/* Current-time indicator — the grid auto-scrolls to "now" but used to
            never mark it. Minute ticker; today only. */}
        {sameDay(selectedDate, nowTick) && (() => {
          const mins = nowTick.getHours() * 60 + nowTick.getMinutes();
          const top = (mins / 30) * SLOT_HEIGHT;
          return (
            <div className={styles.now} style={{ top: `${top}px` }} aria-hidden="true">
              <span className={styles.nowDot} />
              <div className={styles.nowLine} />
              <span className={styles.nowTime}>{formatTime(nowTick)}</span>
            </div>
          );
        })()}

        {daySessions.map(s => {
          const start = new Date(s.start);
          const end = new Date(s.end);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = (endMins - startMins) || 60;
          const top = (startMins / 30) * SLOT_HEIGHT;
          const height = (durationMins / 30) * SLOT_HEIGHT;
          const isShort = durationMins <= 30;

          return (
            <SessionWithMenu
              key={s.id}
              session={s}
              top={top}
              height={height}
              isShort={isShort}
              isDragging={isDragging}
              onDoubleClick={onSessionDouble}
              onMouseDownMove={onSessionMove}
              onMouseDownResize={onSessionResize}
              onEdit={onSessionEdit}
              onDelete={onSessionDelete}
              onColorChange={onSessionColorChange}
            />
          )
        })}

        {/* Grid draft preview */}
        {gridDraft && (() => {
          if (!sameDay(new Date(gridDraft.start), selectedDate)) return null;
          const start = new Date(gridDraft.start);
          const end = new Date(gridDraft.end);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = (endMins - startMins) || 60;
          const top = (startMins / 30) * SLOT_HEIGHT;
          const height = (durationMins / 30) * SLOT_HEIGHT;
          const draftObj = { id: 'draft', start: start.toISOString(), end: end.toISOString(), title: 'New Session' };
          const isBeingDragged = isDragging && dragSession?.id === 'draft';

          return (
            <div
              className={cn(styles.block, styles.draft, styles.blockTall, isBeingDragged && styles.blockDragging)}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
              onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'move')}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openForm({ id: null, title: "", description: "", start, end, linkedProjectId: "none", color: "neutral" });
              }}
            >
              <div className={cn(styles.blockTitle, styles.draftTitle)}>New session</div>
              <div className={styles.blockTime}>
                {formatTime(start)} to {formatTime(end)}
              </div>
              <div className={styles.resize} aria-hidden="true" onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'resize')} />
            </div>
          )
        })()}

        {/* Active drag preview. Was lg:left-24 while every placed session and
            the draft preview use lg:left-28 — the block used to visibly jump
            sideways the instant you released the drag. */}
        {isDragging && dragMode === 'create' && dragStart && dragCurrent && (() => {
          const start = new Date(Math.min(dragStart, dragCurrent));
          const end = new Date(Math.max(dragStart, dragCurrent) + 30 * 60000);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = endMins - startMins;
          const top = (startMins / 30) * SLOT_HEIGHT;
          const height = (durationMins / 30) * SLOT_HEIGHT;

          return (
            <div
              className={cn(styles.block, styles.dragPreview)}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
            />
          )
        })()}
      </div>
    </div>
  );
}

export default memo(DailyTimeline);

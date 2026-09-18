import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPastTime, hasOverlap, sameDay, formatTime, formatHourLabel } from "../../../lib/time";
import { getSessionBlockClass } from "@/lib/sessionColors";
import { SessionColorSwatches } from "./SessionColorSwatches";
import { Menu } from "@/components/composed/Menu";
import { Pen01, Delete01 } from "@/components/ui/CustomIcon.jsx";

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
      className="flex min-h-[40px] group select-none"
    >
      <div className={cn(
        "w-16 sm:w-20 lg:w-24 border-r border-border-subtle text-xs text-subtle-foreground flex items-start justify-center shrink-0 pt-2 transition-colors",
        isHourStart ? "" : "border-b border-border-subtle"
      )}>
        {isHourStart && label}
      </div>

      <div
        className={cn(
          "flex-1 relative transition-colors",
          isHourStart ? "border-b border-dashed border-border-subtle" : "border-b border-border-subtle",
          isPast ? "opacity-30 cursor-not-allowed bg-card/20" :
            isOccupied ? "opacity-50 cursor-not-allowed" :
              "cursor-pointer hover:bg-overlay-subtle"
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

  return (
    <div
      className={cn(
        "absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 rounded-xl backdrop-blur-xs border px-3 overflow-hidden transition-all z-10 select-none group",
        getSessionBlockClass(session.color),
        isDragging ? "opacity-30 pointer-events-none" : "cursor-move",
        isShort ? "flex items-center justify-between py-0" : "flex flex-col py-2 gap-0.5"
      )}
      style={{ top: `${top}px`, height: `${height - 1}px` }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(session);
      }}
      onMouseDown={(e) => onMouseDownMove(e, session)}
    >
      <div className={cn("font-medium truncate pointer-events-none", isShort ? "text-xs" : "text-xs")}>
        {session.title}
      </div>
      {!isShort && session.description && (
        <div className="text-xs opacity-80 line-clamp-2 leading-tight pointer-events-none whitespace-pre-wrap">
          {session.description}
        </div>
      )}
      <div className={cn(
        "text-xs opacity-70 tracking-tight pointer-events-none",
        isShort ? "shrink-0 ml-2" : "mt-auto opacity-0 group-hover:opacity-100 transition-opacity"
      )}>
        {formatTime(start)} - {formatTime(end)}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-overlay cursor-s-resize flex justify-center items-end"
        onMouseDown={(e) => onMouseDownResize(e, session)}
      />
    </div>
  )
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
        <div className="px-2 py-1.5">
          <SessionColorSwatches value={session.color} onChange={(color) => onColorChange(session.id, color)} />
        </div>
        <Menu.ContextSeparator />
        <Menu.ContextItem onClick={() => onEdit(session)}>
          <Pen01 size={14} className="shrink-0" />
          Edit Session
        </Menu.ContextItem>
        <Menu.ContextItem variant="destructive" onClick={() => onDelete(session.id)}>
          <Delete01 size={14} className="shrink-0" />
          Delete Session
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
      <div className="h-full flex items-center justify-center text-faint-foreground text-sm italic">
        Select a date to view timeline
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-0 relative" ref={scrollContainerRef}>
      <div
        className="relative h-full"
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
            <div
              className="pointer-events-none absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 z-10 flex items-center gap-1.5"
              style={{ top: `${top}px` }}
              aria-hidden="true"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
              <div className="h-px flex-1 bg-destructive/50" />
              <span className="rounded-full bg-destructive/90 px-1.5 py-px text-xs font-medium leading-4 text-destructive-foreground">
                {formatTime(nowTick)}
              </span>
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
              className={cn(
                "absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 rounded-md bg-secondary/80 border border-border-strong px-3 py-2 text-xs text-foreground overflow-hidden shadow-sm z-20 select-none",
                isBeingDragged ? "opacity-50" : "cursor-move"
              )}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
              onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'move')}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openForm({ id: null, title: "", description: "", start, end, linkedProjectId: "none", color: "neutral" });
              }}
            >
              <div className="font-medium truncate italic text-foreground/70">New Session</div>
              <div className="text-xs text-muted-foreground truncate">
                {formatTime(start)} - {formatTime(end)}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-overlay cursor-s-resize flex justify-center items-end"
                onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'resize')}
              />
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
              className="absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 rounded-md bg-overlay border border-border-strong z-20 pointer-events-none"
              style={{ top: `${top}px`, height: `${height - 1}px` }}
            />
          )
        })()}
      </div>
    </div>
  );
}

export default memo(DailyTimeline);

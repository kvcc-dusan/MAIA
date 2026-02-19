import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { isPastTime, hasOverlap, sameDay } from "../lib/time";
import { Portal } from "./ui/portal";
import { AnimatePresence } from "framer-motion";

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
        "w-16 sm:w-20 lg:w-24 border-r border-white/5 text-fluid-3xs text-zinc-600 font-mono flex items-start justify-center shrink-0 pt-2 transition-colors",
        isHourStart ? "" : "border-b border-white/5"
      )}>
        {isHourStart && label}
      </div>

      <div
        className={cn(
          "flex-1 relative transition-colors",
          isHourStart ? "border-b border-dashed border-white/5" : "border-b border-white/5",
          isPast ? "opacity-30 cursor-not-allowed bg-zinc-900/20" :
            isOccupied ? "opacity-50 cursor-not-allowed" :
              "cursor-pointer hover:bg-white/[0.02]"
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
  isEditing,
  onDoubleClick,
  onContextMenu,
  onMouseDownMove,
  onMouseDownResize,
  onLongPress
}) => {
  const longPressRef = useRef(null);

  if (isEditing) return null;

  const start = new Date(session.start);
  const end = new Date(session.end);

  const handleTouchStart = (e) => {
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      if (navigator.vibrate) navigator.vibrate(50);
      const touch = e.touches[0];
      onLongPress(touch, session);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div
      className={cn(
        "absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 rounded-xl bg-[#09090b]/90 backdrop-blur-sm border border-white/5 px-3 overflow-hidden hover:bg-white/10 hover:border-white/10 transition-all z-10 select-none group",
        isDragging ? "opacity-30 pointer-events-none" : "cursor-move",
        isShort ? "flex items-center justify-between py-0" : "flex flex-col py-2 gap-0.5"
      )}
      style={{ top: `${top}px`, height: `${height - 1}px` }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(session);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, session);
      }}
      onMouseDown={(e) => onMouseDownMove(e, session)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className={cn("font-medium truncate text-white pointer-events-none", isShort ? "text-xs" : "text-xs")}>
        {session.title}
      </div>
      {!isShort && session.description && (
        <div className="text-fluid-3xs text-zinc-500 line-clamp-2 leading-tight pointer-events-none whitespace-pre-wrap">
          {session.description}
        </div>
      )}
      <div className={cn(
        "text-fluid-3xs text-zinc-500 font-mono tracking-tight pointer-events-none",
        isShort ? "shrink-0 ml-2" : "mt-auto opacity-0 group-hover:opacity-100 transition-opacity"
      )}>
        {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
        onMouseDown={(e) => onMouseDownResize(e, session)}
      />
    </div>
  )
});

function DailyTimeline({
  sessions,
  setSessions,
  selectedDate,
  onOpenSessionForm,
  editingSessionId,
}) {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [dragSession, setDragSession] = useState(null);

  const [gridDraft, setGridDraft] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const scrollContainerRef = useRef(null);

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

  // Context Menu cleanup
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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
      openForm({ id: null, title: "", description: "", start, end, linkedProjectId: "none" });

    } else if (dragMode === 'move' && dragSession) {
      const start = new Date(current);
      const duration = new Date(dragSession.end) - new Date(dragSession.start);
      const end = new Date(start.getTime() + duration);

      if (dragSession.id === 'draft') {
        setGridDraft({ start, end });
      } else {
        const updated = { ...dragSession, start: start.toISOString(), end: end.toISOString() };
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
    } else if (dragMode === 'resize' && dragSession) {
      const start = new Date(dragSession.start);
      let newEnd = new Date(current.getTime() + 30 * 60000);
      if (newEnd <= start) newEnd = new Date(start.getTime() + 30 * 60000);

      if (dragSession.id === 'draft') {
        setGridDraft({ start, end: newEnd });
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
    openForm({ id: null, title: "", description: "", start: slotDate, end: slotEnd, linkedProjectId: "none" });
  }, [sessions, getSlotDate, openForm]);

  const onSessionDouble = useCallback((s) => {
    openForm({
      id: s.id,
      title: s.title,
      description: s.description || "",
      start: new Date(s.start),
      end: new Date(s.end),
      linkedProjectId: s.linkedProjectId || "none"
    });
  }, [openForm]);

  const onSessionContext = useCallback((e, s) => {
    const menuWidth = 192; // w-48 = 12rem = 192px
    const menuHeight = 120; // approximate height
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > vw - 8) x = vw - menuWidth - 8;
    if (y + menuHeight > vh - 8) y = vh - menuHeight - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setContextMenu({ x, y, session: s });
  }, []);

  const onSessionMove = useCallback((e, s) => handleSessionMouseDown(e, s, 'move'), [handleSessionMouseDown]);
  const onSessionResize = useCallback((e, s) => handleSessionMouseDown(e, s, 'resize'), [handleSessionMouseDown]);

  // Long-press handler for touch context menu on sessions
  const onSessionLongPress = useCallback((touch, s) => {
    const menuWidth = 192;
    const menuHeight = 120;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = touch.clientX;
    let y = touch.clientY;

    if (x + menuWidth > vw - 8) x = vw - menuWidth - 8;
    if (y + menuHeight > vh - 8) y = vh - menuHeight - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setContextMenu({ x, y, session: s });
  }, []);

  // Touch handlers for creating sessions on the grid
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
      <div className="h-full flex items-center justify-center text-zinc-700 text-sm italic">
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
          const isPm = hour >= 12;
          const h12 = hour % 12 || 12;
          const label = `${h12.toString().padStart(2, '0')}:00 ${isPm ? 'PM' : 'AM'}`;

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

        {daySessions.map(s => {
          const start = new Date(s.start);
          const end = new Date(s.end);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = (endMins - startMins) || 60;
          const top = (startMins / 30) * SLOT_HEIGHT;
          const height = (durationMins / 30) * SLOT_HEIGHT;
          const isEditing = editingSessionId === s.id;
          const isShort = durationMins <= 30;

          return (
            <SessionItem
              key={s.id}
              session={s}
              top={top}
              height={height}
              isShort={isShort}
              isDragging={isDragging}
              isEditing={isEditing}
              onDoubleClick={onSessionDouble}
              onContextMenu={onSessionContext}
              onMouseDownMove={onSessionMove}
              onMouseDownResize={onSessionResize}
              onLongPress={onSessionLongPress}
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
                "absolute left-16 sm:left-20 lg:left-28 right-2 sm:right-4 rounded-md bg-zinc-800/80 border border-white/20 px-3 py-2 text-xs text-zinc-200 overflow-hidden shadow-sm z-20 select-none",
                isBeingDragged ? "opacity-50" : "cursor-move"
              )}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
              onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'move')}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openForm({ id: null, title: "", description: "", start, end, linkedProjectId: "none" });
              }}
            >
              <div className="font-medium truncate italic text-white/70">New Session</div>
              <div className="text-fluid-3xs text-zinc-500 truncate">
                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
                onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'resize')}
              />
            </div>
          )
        })()}

        {/* Active drag preview */}
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
              className="absolute left-16 sm:left-20 lg:left-24 right-2 sm:right-4 rounded-md bg-white/10 border border-white/20 z-20 pointer-events-none"
              style={{ top: `${top}px`, height: `${height - 1}px` }}
            />
          )
        })()}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <Portal>
            <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed bg-[#18181b] border border-white/10 rounded-xl shadow-2xl py-1.5 w-48 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-fluid-3xs font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1 bg-white/[0.02]">
                Session Options
              </div>
              <button
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={() => {
                  const s = contextMenu.session;
                  openForm({
                    id: s.id,
                    title: s.title,
                    description: s.description || "",
                    start: new Date(s.start),
                    end: new Date(s.end),
                    linkedProjectId: s.linkedProjectId || "none"
                  });
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Edit Session
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                onClick={() => {
                  setSessions(prev => prev.filter(s => s.id !== contextMenu.session.id));
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete Session
              </button>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DailyTimeline);

import React, { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Folder } from "lucide-react";
import { uid } from "../lib/ids";
import { isPastTime, hasOverlap, sameDay } from "../lib/time";
import { INPUT_CLASS } from "@/lib/constants";
import { Portal } from "./ui/portal";
import { PillSelect } from "./ui/PillSelect";
import { AnimatePresence } from "framer-motion";

const SLOT_HEIGHT = 40;

function DailyTimeline({
  sessions,
  setSessions,
  selectedDate,
  projects = [],
  pushToast
}) {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'create', 'move', 'resize'
  const [dragStart, setDragStart] = useState(null); // Date (for create) or Slot Index (for move offset)
  const [dragCurrent, setDragCurrent] = useState(null); // Date (current slot)
  const [dragSession, setDragSession] = useState(null); // Session being edited

  // Session Draft State
  const [sessionDraft, setSessionDraft] = useState({
    id: null,
    title: "",
    description: "",
    start: null,
    end: null,
    linkedTaskId: "none",
    linkedProjectId: "none"
  });
  const [gridDraft, setGridDraft] = useState(null); // { start, end } for on-grid creation
  const [showSessionPopover, setShowSessionPopover] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const scrollContainerRef = useRef(null);

  // Auto-scroll to 7 AM when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const el = document.getElementById('timeline-hour-7');
      if (el && scrollContainerRef.current) {
        el.scrollIntoView({ block: 'start' });
      }
    }
  }, [selectedDate]);

  // Context Menu cleanup
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const saveSession = () => {
    if (!sessionDraft.title.trim()) return;

    // Prevent creating sessions in the past
    if (isPastTime(sessionDraft.start)) {
      pushToast && pushToast("Cannot create sessions in the past");
      return;
    }

    // Check for overlaps (exclude current session if editing)
    if (hasOverlap(sessionDraft.start, sessionDraft.end, sessions, sessionDraft.id)) {
      pushToast && pushToast("Time slot is already occupied");
      return;
    }

    // Create new session
    const newSession = {
      id: sessionDraft.id || uid(),
      title: sessionDraft.title,
      description: sessionDraft.description,
      start: sessionDraft.start.toISOString(),
      end: sessionDraft.end.toISOString(),
      linkedTaskId: sessionDraft.linkedTaskId === 'none' ? null : sessionDraft.linkedTaskId,
      linkedProjectId: sessionDraft.linkedProjectId === 'none' ? null : sessionDraft.linkedProjectId
    };

    if (sessionDraft.id) {
      // Edit existing
      setSessions(prev => prev.map(s => s.id === sessionDraft.id ? newSession : s));
    } else {
      // Create new
      setSessions(prev => [...prev, newSession]);
    }

    // Cleanup
    setShowSessionPopover(false);
    setGridDraft(null);
  };

  const getSlotDate = (i) => {
    const d = new Date(selectedDate);
    d.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
    return d;
  };

  const handleSlotDown = (i) => {
    const d = getSlotDate(i);

    // Prevent interaction with past time slots
    if (isPastTime(d)) return;

    // Prevent interaction with occupied slots
    const slotEnd = new Date(d.getTime() + 30 * 60000);
    if (hasOverlap(d, slotEnd, sessions)) return;

    setGridDraft(null);
    setIsDragging(true);
    setDragMode('create');
    setDragStart(d);
    setDragCurrent(d);
  };

  const handleSlotEnter = (i) => {
    if (isDragging) {
      setDragCurrent(getSlotDate(i));
    }
  };

  const handleSessionMouseDown = (e, s, mode, isDraft = false) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    setDragSession(s);
    setDragStart(new Date(s.start));
    setDragCurrent(new Date(s.start));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const current = dragCurrent || dragStart;

    if (dragMode === 'create' && dragStart) {
      const start = new Date(Math.min(dragStart, current));
      const end = new Date(Math.max(dragStart, current) + 30 * 60000);

      // Prevent creating in past or overlapping slots
      if (isPastTime(start) || hasOverlap(start, end, sessions)) {
        setDragStart(null);
        setDragCurrent(null);
        setDragMode(null);
        return;
      }

      setGridDraft({ start, end });
      setSessionDraft({
        id: null,
        title: "",
        description: "",
        start: start,
        end: end,
        linkedTaskId: "none",
        linkedProjectId: "none"
      });
      setShowSessionPopover(true);

    } else if (dragMode === 'move' && dragSession) {
      const start = new Date(current);
      const duration = new Date(dragSession.end) - new Date(dragSession.start);
      const end = new Date(start.getTime() + duration);

      if (dragSession.id === 'draft') {
        setGridDraft({ start, end });
        setSessionDraft(prev => ({ ...prev, start, end }));
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
        setSessionDraft(prev => ({ ...prev, end: newEnd }));
      } else {
        const updated = { ...dragSession, end: newEnd.toISOString() };
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
    }

    setDragStart(null);
    setDragCurrent(null);
    setDragMode(null);
    setDragSession(null);
  };

  const slots = Array.from({ length: 48 }, (_, i) => i);
  const daySessions = sessions.filter(s => {
    const d = new Date(s.start);
    return sameDay(d, selectedDate);
  });

  if (!selectedDate) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-700 text-sm italic">
        Select a date to view timeline
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-0 relative" ref={scrollContainerRef}>
      {/* Session Popover */}
      {showSessionPopover && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => { setShowSessionPopover(false); setGridDraft(null); }}>
          <div
            className="w-[380px] bg-[#09090b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-white tracking-tight">Session</span>
                  {sessionDraft.start && sessionDraft.end && (
                    <span className="text-xs font-mono text-zinc-400">
                      {sessionDraft.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {sessionDraft.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setShowSessionPopover(false); setGridDraft(null); }}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Cancel</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* TITLE INPUT - Clean, no borders */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Session Title</label>
                  <input
                    autoFocus
                    className="w-full bg-transparent p-2 text-white placeholder:text-zinc-600 text-xl font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg transition-colors"
                    placeholder="Deep work session"
                    value={sessionDraft.title}
                    onChange={e => setSessionDraft(d => ({ ...d, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveSession()}
                  />
                </div>

                {/* LINK PROJECT */}
                <div className="flex flex-col gap-2 w-full mt-2">
                  <PillSelect
                    value={sessionDraft.linkedProjectId}
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    onChange={val => setSessionDraft(d => ({ ...d, linkedProjectId: val }))}
                    placeholder="Link Project"
                    icon={Folder}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="pt-0">
                  <textarea
                    className={cn(INPUT_CLASS, "w-full p-4 h-40 resize-none custom-scrollbar")}
                    placeholder="Add details about this session..."
                    value={sessionDraft.description}
                    onChange={e => setSessionDraft(d => ({ ...d, description: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={saveSession}
                className="w-full bg-white text-black text-sm font-bold uppercase tracking-wider rounded-xl py-3.5 hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-full" onMouseUp={handleMouseUp} onMouseLeave={() => isDragging && handleMouseUp()}>
        {slots.map((i) => {
          const slotDate = getSlotDate(i);
          const hour = Math.floor(i / 2);
          const isHourStart = i % 2 === 0;
          const isPm = hour >= 12;
          const h12 = hour % 12 || 12;
          const label = isHourStart ? `${h12.toString().padStart(2, '0')}:00 ${isPm ? 'PM' : 'AM'}` : '';

          return (
            <div
              key={i}
              id={isHourStart ? `timeline-hour-${hour}` : undefined}
              className="flex min-h-[40px] group select-none"
            >
              <div className={cn(
                "w-24 border-r border-white/5 text-[10px] text-zinc-600 font-mono flex items-start justify-center shrink-0 pt-2 transition-colors",
                isHourStart ? "" : "border-b border-white/5"
              )}>
                {isHourStart && label}
              </div>

              <div
                className={cn(
                  "flex-1 relative transition-colors",
                  isHourStart ? "border-b border-dashed border-white/5" : "border-b border-white/5",
                  (() => {
                    const slotEnd = new Date(slotDate.getTime() + 30 * 60000);
                    const isPast = isPastTime(slotDate);
                    const isOccupied = hasOverlap(slotDate, slotEnd, sessions);

                    if (isPast) return "opacity-30 cursor-not-allowed bg-zinc-900/20";
                    if (isOccupied) return "opacity-50 cursor-not-allowed";
                    return "cursor-pointer hover:bg-white/[0.02]";
                  })()
                )}
                onMouseDown={() => handleSlotDown(i)}
                onMouseEnter={() => handleSlotEnter(i)}
                onDoubleClick={() => {
                  const slotEnd = new Date(slotDate.getTime() + 60 * 60000);
                  if (isPastTime(slotDate) || hasOverlap(slotDate, slotEnd, sessions)) return;

                  setGridDraft({ start: slotDate, end: slotEnd });
                  setSessionDraft({
                    id: null,
                    title: "",
                    description: "",
                    start: slotDate,
                    end: slotEnd,
                    linkedTaskId: "none",
                    linkedProjectId: "none"
                  });
                  setShowSessionPopover(true);
                }}
              />
            </div>
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
          const isBeingDragged = isDragging && dragSession?.id === s.id;
          const isEditing = showSessionPopover && sessionDraft.id === s.id;
          const isShort = durationMins <= 30;

          if (isEditing) return null;

          return (
            <div
              key={s.id}
              className={cn(
                "absolute left-28 right-4 rounded-xl bg-[#09090b]/90 backdrop-blur-sm border border-white/5 px-3 overflow-hidden hover:bg-white/10 hover:border-white/10 transition-all z-10 select-none group",
                isBeingDragged ? "opacity-30 pointer-events-none" : "cursor-move",
                isShort ? "flex items-center justify-between py-0" : "flex flex-col py-2 gap-0.5"
              )}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSessionDraft({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  start: start,
                  end: end,
                  linkedTaskId: s.linkedTaskId || "none",
                  linkedProjectId: s.linkedProjectId || "none"
                });
                setShowSessionPopover(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, session: s });
              }}
              onMouseDown={(e) => handleSessionMouseDown(e, s, 'move')}
            >
              <div className={cn("font-medium truncate text-white pointer-events-none", isShort ? "text-xs" : "text-xs")}>
                {s.title}
              </div>
              {!isShort && s.description && (
                <div className="text-[10px] text-zinc-500 line-clamp-2 leading-tight pointer-events-none whitespace-pre-wrap">
                  {s.description}
                </div>
              )}
              <div className={cn(
                "text-[10px] text-zinc-500 font-mono tracking-tight pointer-events-none",
                isShort ? "shrink-0 ml-2" : "mt-auto opacity-0 group-hover:opacity-100 transition-opacity"
              )}>
                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
                onMouseDown={(e) => handleSessionMouseDown(e, s, 'resize')}
              />
            </div>
          )
        })}

        {showSessionPopover && sessionDraft.start && sessionDraft.end && (() => {
          if (!sameDay(new Date(sessionDraft.start), selectedDate)) return null;
          const start = new Date(sessionDraft.start);
          const end = new Date(sessionDraft.end);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = (endMins - startMins) || 60;
          const top = (startMins / 30) * SLOT_HEIGHT;
          const height = (durationMins / 30) * SLOT_HEIGHT;

          return (
            <div
              className="absolute left-28 right-4 rounded-md bg-zinc-800/80 border border-white/10 px-3 py-2 text-xs text-zinc-200 overflow-hidden shadow-sm z-10 pointer-events-none"
              style={{ top: `${top}px`, height: `${height - 1}px` }}
            >
              <div className="font-medium truncate italic text-white/70">{sessionDraft.title || "New Session..."}</div>
              <div className="text-[10px] text-zinc-500 truncate">
                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          )
        })()}

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
                "absolute left-28 right-4 rounded-md bg-zinc-800/80 border border-white/20 px-3 py-2 text-xs text-zinc-200 overflow-hidden shadow-sm z-20 select-none",
                isBeingDragged ? "opacity-50" : "cursor-move"
              )}
              style={{ top: `${top}px`, height: `${height - 1}px` }}
              onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'move', true)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSessionDraft({
                  id: null,
                  title: "",
                  description: "",
                  start: start,
                  end: end,
                  linkedTaskId: "none",
                  linkedProjectId: "none"
                });
                setShowSessionPopover(true);
              }}
            >
              <div className="font-medium truncate italic text-white/70">New Session</div>
              <div className="text-[10px] text-zinc-500 truncate">
                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-transparent hover:bg-white/10 cursor-s-resize flex justify-center items-end"
                onMouseDown={(e) => handleSessionMouseDown(e, draftObj, 'resize', true)}
              />
            </div>
          )
        })()}

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
              className="absolute left-24 right-4 rounded-md bg-white/10 border border-white/20 z-20 pointer-events-none"
              style={{ top: `${top}px`, height: `${height - 1}px` }}
            />
          )
        })()}
      </div>

      <AnimatePresence>
        {contextMenu && (
          <Portal>
            <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed bg-[#18181b] border border-white/10 rounded-xl shadow-2xl py-1.5 w-48 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1 bg-white/[0.02]">
                Session Options
              </div>
              <button
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={() => {
                  const s = contextMenu.session;
                  const start = new Date(s.start);
                  const end = new Date(s.end);
                  setSessionDraft({
                    id: s.id,
                    title: s.title,
                    description: s.description || "",
                    start: start,
                    end: end,
                    linkedTaskId: s.linkedTaskId || "none",
                    linkedProjectId: s.linkedProjectId || "none"
                  });
                  setShowSessionPopover(true);
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

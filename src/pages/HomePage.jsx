import React, { useState, useMemo, useCallback, useEffect } from "react";

import TodayGrid from "../features/Today/TodayGrid.jsx";
import TodayAgenda from "../features/Today/components/TodayAgenda.jsx";
import { reconcileLayout, DEFAULT_LAYOUT } from "../features/Today/widgets.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";
import { useSignals } from "../hooks/useSignals.js";
import { STORAGE_KEYS, USER_NAME } from "../lib/constants.js";
import { sameDay, isPastTime, formatTime } from "../lib/time.js";

/* -------------------------------------------
   Today — widget dashboard
------------------------------------------- */

export default function TodayPage({
  tasks = [],
  notes = [],
  projects = [],
  sessions = [],
  reminders = [],
  createNote,
  toggleTask,
  onOpenPulse,
  onOpenNote,
}) {
  const { quote, greeting } = useHomeGreeting();
  const { weather, loading: weatherLoading, error: weatherError, refresh: retryWeather } =
    useWeather();
  const [captureContent, setCaptureContent] = useState("");

  const [storedLayout, setStoredLayout] = useLocalStorage(STORAGE_KEYS.TODAY_LAYOUT, DEFAULT_LAYOUT);
  const layout = useMemo(() => reconcileLayout(storedLayout), [storedLayout]);

  // One clock for the page. WorldMapWidget used to run its own 1s interval on
  // top of the greeting hook's, so two timers were re-rendering independently.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStr = useMemo(() => now.toDateString(), [now]);
  const openPulse = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  // Focus is the UNTIMED half of the page. Anything carrying a `due` is on the
  // agenda spine above, so excluding it here is what keeps the two lists from
  // showing the same task twice.
  const todayTasks = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "Active");
    const actions = [];
    activeProjects.forEach((p) => {
      const pTask = tasks.find((t) => t.projectId === p.id && t.isNextAction && !t.done && !t.due);
      if (pTask) actions.push({ ...pTask, isProject: true, contextLabel: p.name });
    });

    const inboxTasks = tasks
      .filter((t) => !t.done && !t.projectId && !t.due)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((t) => ({ ...t, isProject: false, contextLabel: "Inbox" }));

    return [...actions, ...inboxTasks];
  }, [tasks, projects]);

  // The agenda: everything today that carries a clock. Deliberately disjoint
  // from todayTasks above, which is the untimed next-action/inbox view — a task
  // with a `due` belongs on the spine, not in Focus.
  const projectName = useMemo(() => {
    const byId = {};
    projects.forEach((p) => { byId[p.id] = p.name; });
    return byId;
  }, [projects]);

  const { overdue, todayItems, nowIndex } = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const past = [];
    const timed = [];

    tasks.forEach((t) => {
      if (t.done || !t.due) return;
      const due = new Date(t.due);
      if (isNaN(due.getTime())) return;
      const row = {
        id: `task-${t.id}`,
        kind: "task",
        at: due,
        task: t,
        contextLabel: t.projectId ? projectName[t.projectId] : "Inbox",
        isPast: isPastTime(due),
        isOverdue: due < startOfToday,
      };
      if (due < startOfToday) past.push(row);
      else if (sameDay(due, now)) timed.push(row);
    });

    sessions.forEach((s) => {
      if (!s.start || !sameDay(s.start, now)) return;
      const start = new Date(s.start);
      if (isNaN(start.getTime())) return;
      timed.push({
        id: `session-${s.id}`,
        kind: "session",
        at: start,
        title: s.title || "Session",
        // Sessions are written with linkedProjectId; reading s.projectId here
        // is what made every project's session count render as zero.
        contextLabel: s.linkedProjectId ? projectName[s.linkedProjectId] : null,
        timeLabel: s.end ? `${formatTime(start)} – ${formatTime(s.end)}` : formatTime(start),
        isPast: s.end ? isPastTime(s.end) : isPastTime(start),
        session: s,
      });
    });

    reminders.forEach((r) => {
      if (!r.scheduledAt || !sameDay(r.scheduledAt, now)) return;
      const at = new Date(r.scheduledAt);
      if (isNaN(at.getTime())) return;
      timed.push({
        id: `signal-${r.id}`,
        kind: "signal",
        at,
        title: r.title || "Signal",
        contextLabel: null,
        timeLabel: formatTime(at),
        isPast: isPastTime(at),
        signal: r,
      });
    });

    const byTime = (a, b) => a.at - b.at;
    past.sort(byTime);
    timed.sort(byTime);

    const idx = timed.findIndex((item) => !item.isPast);
    return {
      overdue: past,
      todayItems: timed,
      nowIndex: idx === -1 ? timed.length : idx,
    };
  }, [tasks, sessions, reminders, projectName, now]);

  const handleOpenAgendaItem = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  const handleTaskClick = useCallback(
    (task) => {
      if (task.isProject && task.projectId) onOpenNote?.(task.projectId, "project");
      else onOpenPulse?.();
    },
    [onOpenNote, onOpenPulse]
  );

  const todayEntries = useMemo(
    () =>
      notes
        .filter((n) => {
          const isToday = new Date(n.createdAt).toDateString() === todayStr;
          const isJournal = (n.tags || []).some((t) => t.toLowerCase() === "journal");
          return isToday && isJournal;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [notes, todayStr]
  );

  const signals = useSignals(notes, projects, { velocityLimit: 5, stalenessLimit: 3 });

  const handleCapture = useCallback(() => {
    if (!captureContent.trim()) return;
    const firstLine = captureContent.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 40);
    const title = `${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${firstLine || "Quick note"}`;
    createNote?.({ title, content: captureContent, tags: ["journal"] });
    setCaptureContent("");
  }, [captureContent, createNote]);

  // One bag of props for every widget; each picks what it needs and ignores the
  // rest. Keeps the registry from having to describe per-widget wiring.
  const widgetProps = {
    // clock-map
    weather,
    weatherLoading,
    weatherError,
    retryWeather,
    now,
    // focus
    todayTasks,
    sessions,
    signals,
    onOpenPulse: openPulse,
    onTaskClick: handleTaskClick,
    // capture
    captureContent,
    setCaptureContent,
    onCapture: handleCapture,
    todayEntries,
    onOpenNote,
  };

  // The header block. The greeting used to sit bottom-left under an empty
  // middle; it anchors the page from the top now (hero-header decision).
  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    [now]
  );

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-background font-sans text-foreground selection:bg-overlay-strong">
      <div className="home-bg pointer-events-none absolute inset-0 z-0" />

      {/* `min-h-full` used to pin this column to exactly one viewport, which is
          why the grid below could only ever fill the screen and nothing could
          be added under it. It sizes to content now and the page scrolls. */}
      <div className="home-hero relative z-10 flex w-full flex-col">
        <TodayGrid
          layout={layout}
          setLayout={setStoredLayout}
          widgetProps={widgetProps}
          agenda={
            <TodayAgenda
              overdue={overdue}
              today={todayItems}
              nowIndex={nowIndex}
              nowLabel={formatTime(now)}
              onToggleTask={toggleTask}
              onOpenItem={handleOpenAgendaItem}
            />
          }
          greeting={
            <div className="home-greeting-block">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Today · {dateLabel}
              </p>
              <h2 className="home-greeting font-sans font-medium tracking-tight">
                <span className="text-muted-foreground">{greeting}</span>{" "}
                <span className="text-foreground">{USER_NAME}.</span>
              </h2>
              <p className="home-quote font-sans italic text-foreground/45">
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}

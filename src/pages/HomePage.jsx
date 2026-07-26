import React, { useState, useMemo, useCallback, useEffect } from "react";

import TodayGrid from "../features/Today/TodayGrid.jsx";
import { reconcileLayout, DEFAULT_LAYOUT } from "../features/Today/widgets.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";
import { useSignals } from "../hooks/useSignals.js";
import { STORAGE_KEYS, USER_NAME } from "../lib/constants.js";

/* -------------------------------------------
   Today — widget dashboard
------------------------------------------- */

export default function TodayPage({
  tasks = [],
  notes = [],
  projects = [],
  sessions = [],
  createNote,
  onOpenPulse,
  onOpenNote,
}) {
  const { quote, greeting } = useHomeGreeting();
  const { weather } = useWeather();
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

  const todayTasks = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "Active");
    const actions = [];
    activeProjects.forEach((p) => {
      const pTask = tasks.find((t) => t.projectId === p.id && t.isNextAction && !t.done);
      if (pTask) actions.push({ ...pTask, isProject: true, contextLabel: p.name });
    });

    const inboxTasks = tasks
      .filter((t) => !t.done && !t.projectId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((t) => ({ ...t, isProject: false, contextLabel: "Inbox" }));

    return [...actions, ...inboxTasks];
  }, [tasks, projects]);

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

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-background font-sans text-foreground selection:bg-overlay-strong">
      <div className="home-bg pointer-events-none absolute inset-0 z-0" />

      <div className="home-hero relative z-10 flex min-h-full w-full flex-col">
        <TodayGrid
          layout={layout}
          setLayout={setStoredLayout}
          widgetProps={widgetProps}
          greeting={
            <div className="home-greeting-block">
              <h1 className="home-greeting font-sans font-medium tracking-tight">
                <span className="text-muted-foreground">{greeting}</span>{" "}
                <span className="text-foreground">{USER_NAME}.</span>
              </h1>
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

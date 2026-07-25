import React, { useState, useMemo, useCallback } from "react";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import FocusWidget from "../components/FocusWidget.jsx";
import QuickCaptureWidget from "../components/QuickCaptureWidget.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";
import { useSignals } from "../hooks/useSignals.js";

/* -------------------------------------------
   Home / Today  — Single-screen dashboard
------------------------------------------- */

export default function TodayPage({
  tasks = [],
  notes = [],
  projects = [],
  ledger = [],
  sessions = [],
  reminders = [],
  createNote,
  updateNote,
  onOpenPulse,
  onOpenNote,
}) {
  const { now, quote, greeting } = useHomeGreeting();
  const { weather } = useWeather();
  const [captureContent, setCaptureContent] = useState("");

  const userName = "Dušan";

  // Today's date string
  const todayStr = useMemo(() => now.toDateString(), [now]);

  // Stable callback for the button
  const openPulse = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  // Today's tasks (for FocusWidget)
  const todayTasks = useMemo(() => {
    // 1. Next Actions from ACTIVE Projects
    // Sort projects by their order in the list (assuming user order implies priority)
    const activeProjects = projects.filter(p => p.status === "Active");

    let actions = [];
    activeProjects.forEach(p => {
      const pTask = tasks.find(t => t.projectId === p.id && t.isNextAction && !t.done);
      if (pTask) {
        actions.push({ ...pTask, isProject: true, contextLabel: p.name });
      }
    });

    // 2. Global Inbox Tasks (Newest First)
    const inboxTasks = tasks
      .filter((t) => !t.done && !t.projectId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((t) => ({ ...t, isProject: false, contextLabel: "Inbox" }));

    return [...actions, ...inboxTasks];
  }, [tasks, projects]);

  const handleTaskClick = useCallback((task) => {
    if (task.isProject && task.projectId) {
      // Navigate to Project
      onOpenNote?.(task.projectId, "project");
    } else {
      // Open Chronos for global tasks
      onOpenPulse?.();
    }
  }, [onOpenNote, onOpenPulse]);

  // Recent #journal notes (today)
  const todayEntries = useMemo(() => {
    return notes
      .filter((n) => {
        const isToday = new Date(n.createdAt).toDateString() === todayStr;
        const isJournal = (n.tags || []).some((t) => t.toLowerCase() === "journal");
        return isToday && isJournal;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notes, todayStr]);

  // Shared signals hook
  const signals = useSignals(notes, projects, { velocityLimit: 5, stalenessLimit: 3 });

  // Quick Capture → creates a Note with #journal tag (atomic)
  const handleCapture = useCallback(() => {
    if (!captureContent.trim()) return;
    const firstLine = captureContent.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 40);
    const title = `${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${firstLine || "Quick note"}`;

    createNote?.({
      title,
      content: captureContent,
      tags: ["journal"],
    });
    setCaptureContent("");
  }, [captureContent, createNote]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-black font-sans text-white selection:bg-white/20">

      {/* Near-black background with a faint vignette */}
      <div className="home-bg absolute inset-0 pointer-events-none z-0" />

      {/* Centered composition — greeting above, widgets in a row beneath */}
      <div className="flex-1 w-full relative z-10 home-hero">
        <div className="home-stack min-h-full w-full px-fluid-page">

          {/* Greeting */}
          <div className="home-greeting-block text-center">
            <h1 className="home-greeting font-sans font-medium tracking-tight">
              <span className="text-zinc-500">{greeting}</span>{" "}
              <span className="text-white">{userName || "Dušan"}.</span>
            </h1>
            <p className="home-quote font-sans italic text-white/45">
              &ldquo;{quote}&rdquo;
            </p>
          </div>

          {/* Widgets row — wraps to a stack on narrow windows */}
          <div className="home-widgets-row">
            <GlassErrorBoundary>
              <WorldMapWidget weather={weather} />
            </GlassErrorBoundary>

            <FocusWidget
              todayTasks={todayTasks}
              sessions={sessions}
              signals={signals}
              onOpenPulse={openPulse}
              onTaskClick={handleTaskClick}
            />

            <QuickCaptureWidget
              captureContent={captureContent}
              setCaptureContent={setCaptureContent}
              onCapture={handleCapture}
              todayEntries={todayEntries}
              onOpenNote={onOpenNote}
            />
          </div>
        </div>
      </div>

    </div>
  );
}


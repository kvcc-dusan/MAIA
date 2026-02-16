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
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-black font-sans text-white selection:bg-white/20">

      {/* Single-screen hero — greeting + widgets */}
      <div className="flex-1 w-full">
        <div className="grid h-full w-full grid-cols-1 items-center gap-12 p-4 md:p-8 lg:grid-cols-2 lg:px-16">

          {/* LEFT ZONE: Greeting */}
          <div className="flex flex-col items-start justify-center space-y-6">
            <div className="space-y-4 text-left">
              <h1
                className="whitespace-nowrap text-4xl font-semibold tracking-tight mix-blend-difference grayscale md:text-5xl lg:text-6xl"
                style={{ textShadow: "0 0 30px rgba(0,0,0,0.5)" }}
              >
                <span className="text-white/50">{greeting}</span>{" "}
                <span className="text-white">{userName || "Dušan"}.</span>
              </h1>
              <p className="max-w-xl text-base font-normal italic leading-relaxed text-white/90 mix-blend-difference grayscale md:text-lg">
                "{quote}"
              </p>
            </div>
          </div>

          {/* RIGHT ZONE: 3 Vertically-Centered Glass Widgets */}
          <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-5 lg:ml-auto lg:mx-0 lg:items-end">

            {/* 1. World Map & Weather Widget */}
            <GlassErrorBoundary>
              <WorldMapWidget weather={weather} />
            </GlassErrorBoundary>

            {/* 2. Today's Focus — tasks, sessions, momentum */}
            <FocusWidget
              todayTasks={todayTasks}
              sessions={sessions}
              signals={signals}
              onOpenPulse={openPulse}
              onTaskClick={handleTaskClick}
            />

            {/* 3. Quick Capture — journal entry */}
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

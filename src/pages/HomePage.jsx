import React, { useState, useMemo, useCallback } from "react";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import FocusWidget from "../components/FocusWidget.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";
import { useSignals } from "../hooks/useSignals.js";
import EditorRich from "../components/EditorRich.jsx";

/* -------------------------------------------
   Home / Today
------------------------------------------- */

export default function TodayPage({
  tasks = [],
  notes = [],
  projects = [],
  ledger = [],
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
  const dateDisplay = useMemo(() => new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' }), []);
  const dayName = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long' }), []);

  // Stable callback for the button
  const openPulse = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  // Today's tasks (for FocusWidget)
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.due && new Date(t.due).toDateString() === todayStr);
  }, [tasks, todayStr]);

  const completedToday = useMemo(() => {
    return tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === todayStr);
  }, [tasks, todayStr]);

  // Recent #journal notes (today)
  const todayEntries = useMemo(() => {
    return notes
      .filter(n => {
        const isToday = new Date(n.createdAt).toDateString() === todayStr;
        const isJournal = (n.tags || []).some(t => t.toLowerCase() === "journal");
        return isToday && isJournal;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notes, todayStr]);

  // Pending decision reviews
  const pendingReviews = useMemo(() => {
    return ledger.filter(d => d.status === "open" && d.reviewDate && new Date(d.reviewDate) <= new Date());
  }, [ledger]);

  const openDecisions = useMemo(() => {
    return ledger.filter(d => d.status === "open").length;
  }, [ledger]);

  // Shared signals hook (replaces ReviewPage's inline computation)
  const signals = useSignals(notes, projects, { velocityLimit: 3, stalenessLimit: 3 });

  // Quick Capture → creates a Note with #journal tag
  const handleCapture = useCallback(() => {
    if (!captureContent.trim()) return;
    const firstLine = captureContent.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 40);
    const title = `${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${firstLine || "Quick note"}`;

    const id = createNote?.();
    if (id) {
      updateNote?.({
        id,
        title,
        content: captureContent,
        tags: ["journal"],
      });
    }
    setCaptureContent("");
  }, [captureContent, createNote, updateNote]);

  // Stats
  const totalDue = todayTasks.length;
  const totalDone = completedToday.length;

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto bg-midnight font-sans text-white selection:bg-white/20 custom-scrollbar">

      {/* ============================================================= */}
      {/*  HERO SECTION — Original Home greeting + widgets              */}
      {/* ============================================================= */}
      <div className="flex-none min-h-screen w-full">
        <div className="grid h-full min-h-screen w-full grid-cols-1 items-center gap-12 p-4 md:p-8 lg:grid-cols-2 lg:px-16">

          {/* LEFT ZONE: Greeting */}
          <div className="flex flex-col items-start justify-center space-y-6">
            <div className="space-y-4 text-left">
              <h1
                className="whitespace-nowrap text-4xl font-semibold tracking-tight mix-blend-difference grayscale md:text-5xl lg:text-6xl"
                style={{ textShadow: "0 0 30px rgba(0,0,0,0.5)" }}
              >
                <span className="text-white/50">{greeting}</span> <span className="text-white">{userName || "Dušan"}.</span>
              </h1>
              <p
                className="max-w-xl text-base font-normal italic leading-relaxed text-white/90 mix-blend-difference grayscale md:text-lg"
              >
                "{quote}"
              </p>
            </div>
          </div>

          {/* RIGHT ZONE: Glass Widgets Stack */}
          <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-6 lg:ml-auto lg:mx-0 lg:items-end">
            {/* World Map & Weather Widget */}
            <GlassErrorBoundary>
              <WorldMapWidget weather={weather} />
            </GlassErrorBoundary>

            {/* Combined Widget: Focus & Reminders */}
            <FocusWidget todayTasks={todayTasks} onOpenPulse={openPulse} />
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/*  TODAY SECTION — Quick Capture, Tasks, Signals, Entries        */}
      {/* ============================================================= */}
      <div className="w-full bg-black">
        <div className="w-full max-w-5xl mx-auto py-12 px-4 md:px-8">

          {/* Section Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">{dateDisplay}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">{dayName}</div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              {totalDone > 0 && <span className="text-emerald-500/70">{totalDone} done</span>}
              {totalDue > 0 && <span>{totalDue} due</span>}
              {openDecisions > 0 && <span>{openDecisions} open decisions</span>}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: Capture + Recent */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* Quick Capture */}
              <div className="bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-3">Quick Capture</div>
                <div className="min-h-[80px] max-h-[200px] overflow-y-auto custom-scrollbar">
                  <EditorRich
                    value={captureContent}
                    onChange={setCaptureContent}
                    editable={true}
                    className="outline-none min-h-full"
                  />
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={handleCapture}
                    disabled={!captureContent.trim()}
                    className="text-[10px] font-bold uppercase tracking-widest px-5 py-2 bg-white rounded-lg text-black hover:bg-zinc-200 transition-all font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Capture
                  </button>
                </div>
              </div>

              {/* Recent Entries */}
              <div className="bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-3">
                  Today's Entries
                  {todayEntries.length > 0 && <span className="text-zinc-600 ml-2">{todayEntries.length}</span>}
                </div>
                <div className="space-y-4">
                  {todayEntries.length === 0 ? (
                    <div className="text-zinc-700 text-xs font-mono italic py-4 text-center">No entries yet today.</div>
                  ) : (
                    todayEntries.map(entry => (
                      <div
                        key={entry.id}
                        onClick={() => onOpenNote?.(entry.id)}
                        className="group pl-4 border-l border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                      >
                        <div className="text-[10px] text-zinc-600 font-mono mb-1 uppercase tracking-wider">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-zinc-400 text-sm font-mono leading-relaxed line-clamp-3 group-hover:text-zinc-300 transition-colors">
                          {entry.title}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Tasks + Reviews + Signals */}
            <div className="lg:col-span-7 flex flex-col gap-6 pb-24">

              {/* Today's Tasks */}
              <div className="bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                    Today's Tasks
                    {todayTasks.length > 0 && <span className="text-zinc-600 ml-2">{todayTasks.length}</span>}
                  </div>
                  <button
                    onClick={onOpenPulse}
                    className="text-[10px] font-mono text-zinc-600 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1"
                  >
                    Open Chronos
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </button>
                </div>
                {todayTasks.length === 0 ? (
                  <div className="text-zinc-700 text-xs font-mono italic py-3 text-center">No tasks due today.</div>
                ) : (
                  <div className="space-y-2">
                    {todayTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                        <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 ${task.done ? 'bg-emerald-500/20 border-emerald-500/40' : 'border-white/20'}`}>
                          {task.done && (
                            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-sm font-mono ${task.done ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>{task.title}</div>
                          {task.desc && <div className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">{task.desc}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {completedToday.length > 0 && completedToday.length !== todayTasks.filter(t => t.done).length && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-wider">
                      +{completedToday.length} completed today
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Decision Reviews */}
              {pendingReviews.length > 0 && (
                <div className="bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-4">
                    Reviews Due
                    <span className="text-amber-500/70 ml-2">{pendingReviews.length}</span>
                  </div>
                  <div className="space-y-3">
                    {pendingReviews.map(d => (
                      <div key={d.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-sm text-zinc-300 font-mono">{d.title}</div>
                          <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                            Logged {new Date(d.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${d.stakes === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                          d.stakes === 'medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                            'border-blue-500/30 text-blue-400 bg-blue-500/10'
                          }`}>{d.stakes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signals */}
              {(signals.velocity.length > 0 || signals.staleness.length > 0) && (
                <div className="bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-4">Signals</div>

                  {signals.velocity.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mb-2">Momentum (7d)</div>
                      <div className="space-y-1.5">
                        {signals.velocity.map(v => (
                          <div key={v.tag} className="flex items-center justify-between">
                            <span className="text-zinc-400 text-xs font-mono">#{v.tag}</span>
                            <span className={`text-xs font-mono ${v.velocity > 0 ? 'text-emerald-400' : v.velocity < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                              {v.velocity > 0 ? '+' : ''}{v.velocity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {signals.staleness.length > 0 && (
                    <div>
                      <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mb-2">At Risk</div>
                      <div className="space-y-1.5">
                        {signals.staleness.map(s => (
                          <div key={s.project.id} className="flex items-center justify-between">
                            <span className="text-zinc-400 text-xs font-mono truncate">{s.project.name}</span>
                            <span className="text-red-400/70 text-[10px] font-mono">{s.lastActivityDays}d idle</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card.jsx";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import FocusTaskItem from "../components/FocusTaskItem.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";


/* -------------------------------------------
   Home
------------------------------------------- */

export default function Home({ tasks = [], onOpenPulse }) {
  const { now, quote, greeting } = useHomeGreeting();
  const { weather } = useWeather();

  // Stable callback for the button
  const openPulse = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  const userName = "Dušan";

  // Today data
  const todayStr = useMemo(() => now.toDateString(), [now]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.due && new Date(t.due).toDateString() === todayStr);
  }, [tasks, todayStr]);




  return (
    <div className="relative flex h-full w-full overflow-hidden bg-midnight font-sans text-white selection:bg-white/20">
      {/*
        MAIN CONTENT GRID
        - Removed max-w-7xl mx-auto to strict positioning from edge
        - lg:pl-[128px] = Explicit 128px from left edge on desktop
      */}
      <div className="grid h-full w-full grid-cols-1 items-center gap-12 p-8 lg:grid-cols-2 lg:px-16 pb-32"> {/* Added pb-32 for Dock space */}

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
          <GlassErrorBoundary>
            <Card className="flex min-h-[260px] w-full flex-col rounded-[24px] border-[0.5px] border-white/10 bg-card/80 shadow-lg backdrop-blur-sm">

              {/* HEADER: Focus Title */}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Focus</CardTitle>
              </CardHeader>

              {/* BODY: Focus List */}
              <div className="flex flex-1 flex-col">
                {/* Focus Items */}
                <CardContent className="flex flex-col gap-4 p-5 pb-4 pt-1">
                  {todayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-2 text-center font-mono text-[10px] italic uppercase tracking-widest text-muted-foreground">
                      no tasks for today.
                    </div>
                  ) : (
                    <ul className="max-h-[80px] space-y-2 overflow-y-auto custom-scrollbar">
                      {todayTasks.slice(0, 3).map(task => (
                        <FocusTaskItem key={task.id} task={task} />
                      ))}
                      {todayTasks.length > 3 && (
                        <li className="pt-1 text-[10px] text-muted-foreground">+{todayTasks.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </div>

              {/* FOOTER: Open Chronos */}
              <CardFooter className="relative z-20 flex items-center justify-end border-t-[0.5px] border-white/5 bg-muted/20 p-4 py-3">
                <button
                  onClick={openPulse}
                  aria-label="Open Chronos Dashboard"
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>Open Chronos</span>
                  {/* Tiny arrow icon optional */}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
              </CardFooter>

            </Card>
          </GlassErrorBoundary>
        </div>
      </div>


    </div>
  );
}

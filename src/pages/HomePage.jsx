import React, { useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card.jsx";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";
import { useWeather } from "../hooks/useWeather.js";

/* -------------------------------------------
   Home
------------------------------------------- */

export default function Home({ tasks = [], reminders = [], onOpenPulse }) {
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

  const todayReminders = useMemo(() => {
    return reminders.filter(
      (r) => new Date(r.scheduledAt).toDateString() === todayStr && !r.delivered
    );
  }, [reminders, todayStr]);


  return (
    <div className="relative h-full w-full flex overflow-hidden bg-[#050505] text-white font-sans selection:bg-white/20">



      {/*
        MAIN CONTENT GRID
        - Removed max-w-7xl mx-auto to strict positioning from edge
        - lg:pl-[128px] = Explicit 128px from left edge on desktop
      */}
      <div className="w-full h-full p-8 lg:pr-16 lg:pl-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* LEFT ZONE: Greeting */}
        <div className="flex flex-col justify-center items-start space-y-6">
          <div className="space-y-4 text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-semibold whitespace-nowrap mix-blend-difference grayscale"
              style={{ textShadow: "0 0 30px rgba(0,0,0,0.5)" }}
            >
              <span className="text-white/50">{greeting}</span> <span className="text-white">{userName || "Dušan"}.</span>
            </h1>
            <p
              className="text-base md:text-lg text-white/90 font-normal italic max-w-xl leading-relaxed mix-blend-difference grayscale"
            >
              "{quote}"
            </p>
          </div>
        </div>

        {/* RIGHT ZONE: Glass Widgets Stack */}
        <div className="flex flex-col items-center lg:items-end justify-center space-y-6 w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">

          {/* World Map & Weather Widget */}
          <GlassErrorBoundary>
            <WorldMapWidget weather={weather} />
          </GlassErrorBoundary>

          {/* Combined Widget: Focus & Reminders */}
          <GlassErrorBoundary>
            <Card className="flex flex-col w-full min-h-[260px] bg-card/80 backdrop-blur-sm shadow-lg border-[0.5px] border-white/10 rounded-[24px]">

              {/* HEADER: Focus Title */}
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Today's Focus</CardTitle>
              </CardHeader>

              {/* BODY: Focus List */}
              <div className="flex-1 flex flex-col">
                {/* Focus Items */}
                <CardContent className="p-5 pt-1 pb-4 flex flex-col gap-4">
                  {todayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono text-center italic py-2">
                      no tasks for today.
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[80px]">
                      {todayTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-card-foreground">
                          <span className={`w-1.5 h-1.5 rounded-full ${task.done ? 'bg-muted-foreground' : 'bg-primary'}`} />
                          <span className={task.done ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                        </div>
                      ))}
                      {todayTasks.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pt-1">+{todayTasks.length - 3} more</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>

              {/* FOOTER: Open Chronos */}
              <CardFooter className="p-4 py-3 flex justify-end items-center z-20 relative bg-muted/20 border-t-[0.5px] border-white/5">
                <button
                  onClick={openPulse}
                  className="flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest font-bold"
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

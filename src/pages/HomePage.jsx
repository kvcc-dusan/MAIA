import React, { useMemo, useCallback } from "react";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import FocusWidget from "../components/FocusWidget.jsx";
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
      <div className="grid h-full w-full grid-cols-1 items-center gap-12 p-4 md:p-8 lg:grid-cols-2 lg:px-16">

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
  );
}

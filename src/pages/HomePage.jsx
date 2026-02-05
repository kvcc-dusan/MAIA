// src/pages/HomePage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card.jsx";

import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import FocusTaskItem from "../components/FocusTaskItem.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";

// "YYYY-MM-DDTHH:00" in local time (no Z)
function localHourISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 13) + ":00";
}

// WMO Weather interpretation codes (Open-Meteo)
function getWeatherLabel(code) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2 || code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain";
  if (code >= 85 && code <= 86) return "Snow";
  if (code >= 95 && code <= 99) return "Storm";
  return "Clear";
}

/* -------------------------------------------
   Weather (Open-Meteo, no API key)
------------------------------------------- */
async function fetchWeather({ lat, lon }) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation_probability,weathercode&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  return res.json();
}

async function reverseGeocode({ lat, lon }) {
  // 1) Open-Meteo (no key)
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en`
    );
    if (res.ok) {
      const data = await res.json();
      const best = data?.results?.[0];
      if (best) {
        const city =
          best.city ||
          best.locality ||
          best.town ||
          best.village ||
          best.name ||
          best.admin3 ||
          best.admin2;
        const cc = best.country_code || best.country_code2 || best.country_code3;
        if (city || cc) return `${city || best.name}${cc ? `, ${cc}` : ""}`;
      }
    }
  } catch {
    // ignore
  }

  // 2) Fallback: BigDataCloud (no key)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (res.ok) {
      const d = await res.json();
      const city = d.city || d.locality || d.principalSubdivision || d.countryName;
      const cc = d.countryCode || "";
      if (city || cc) return `${city}${cc ? `, ${cc}` : ""}`;
    }
  } catch {
    // ignore
  }

  return null; // last resort
}

/* -------------------------------------------
   Home
------------------------------------------- */

export default function Home({ tasks = [], reminders = [], onOpenPulse }) {
  const { now, quote, greeting } = useHomeGreeting();
  const [weatherSnap, setWeatherSnap] = useState(null);

  // Stable callback for the button
  const openPulse = useCallback(() => onOpenPulse?.(), [onOpenPulse]);

  const userName = "Dušan";

  // Weather & place
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Geolocation first
        const coords = await new Promise((resolve, reject) => {
          if (!("geolocation" in navigator)) return reject(new Error("no geo"));
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => reject(new Error("denied")),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });

        const w = await fetchWeather(coords);

        // Which hour is "now" in returned local timeline
        const nowKey = localHourISO(new Date());
        const idx = (w.hourly?.time || []).findIndex((t) => t.startsWith(nowKey));

        const next2 = [];
        for (let i = 0; i < 2; i++) {
          const v = w.hourly?.precipitation_probability?.[idx + i] ?? 0;
          next2.push(Number(v) || 0);
        }

        let place = null;
        try {
          const p = await reverseGeocode(coords);
          if (p) place = p;
        } catch {
          // ignore
        }

        if (!cancelled) {
          setWeatherSnap({
            temp: w.hourly?.temperature_2m?.[idx],
            condition: getWeatherLabel(w.hourly?.weathercode?.[idx]),
            next2hProb: next2,
            place: place || undefined,
            coords, // <- keep for map dot
          });
        }
      } catch {
        if (!cancelled) setWeatherSnap(null);
      }
    };

    run();
    const t = setInterval(run, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

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
            <WorldMapWidget weather={weatherSnap} />
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
                        <FocusTaskItem key={task.id} task={task} />
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

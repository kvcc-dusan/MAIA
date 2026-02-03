// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import GlassSurface from "../components/GlassSurface.jsx";
import ColorBends from "../components/ColorBends.jsx";
import WorldMapWidget from "../components/WorldMapWidget.jsx";
import { GlassErrorBoundary } from "../components/GlassErrorBoundary.jsx";
import { useHomeGreeting } from "../hooks/useHomeGreeting.js";

// "YYYY-MM-DDTHH:00" in local time (no Z)
function localHourISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 13) + ":00";
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
  const openPulse = () => onOpenPulse?.();

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
  const todayStr = now.toDateString();
  const todayTasks = tasks.filter((t) => t.due && new Date(t.due).toDateString() === todayStr);
  const todayReminders = reminders.filter(
    (r) => new Date(r.scheduledAt).toDateString() === todayStr && !r.delivered
  );


  return (
    <div className="relative h-full w-full flex overflow-hidden bg-black text-white font-sans selection:bg-white/20">

      {/* Background: React Bits Color Bends */}
      {/* Background: Pitch Black as requested */}
      <div className="absolute inset-0 z-0 bg-black" />

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
              <span className="text-white/80">{greeting}</span> <span className="text-white">{userName || "Dušan"}.</span>
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

          {/* Today's Focus */}
          <GlassErrorBoundary>
            <GlassSurface className="p-6 flex flex-col min-h-[140px]" withGlow={true}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Today's Focus</span>
                <button onClick={openPulse} className="text-[10px] text-zinc-400 hover:text-white transition-colors">OPEN CHRONOS</button>
              </div>

              {todayTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs text-center italic">
                  "No tasks for today."
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar max-h-[80px]">
                  {todayTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${task.done ? 'bg-zinc-700' : 'bg-white'}`} />
                      <span className={task.done ? 'line-through text-zinc-600' : ''}>{task.title}</span>
                    </div>
                  ))}
                  {todayTasks.length > 3 && (
                    <div className="text-[10px] text-zinc-600 pt-1">+{todayTasks.length - 3} more</div>
                  )}
                </div>
              )}
            </GlassSurface>
          </GlassErrorBoundary>

          {/* Reminders / Quick Note */}
          <GlassErrorBoundary>
            <GlassSurface className="p-6 flex flex-col min-h-[100px]" withGlow={true}>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Reminders</span>
              {todayReminders.length === 0 ? (
                <div className="text-sm text-zinc-600 italic">Clean slate.</div>
              ) : (
                <div className="space-y-1">
                  {todayReminders.slice(0, 2).map((r, i) => (
                    <div key={i} className="text-xs text-zinc-400 truncate">• {r.title}</div>
                  ))}
                </div>
              )}
            </GlassSurface>
          </GlassErrorBoundary>

        </div>
      </div>
    </div>
  );
}

// src/components/HomePage.jsx
import React, { useEffect, useMemo, useState } from "react";

function useGeolocatedWeather() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    tempC: null,
    precipNext2h: null,
  });

  useEffect(() => {
    let cancelled = false;

    const go = async (lat, lon) => {
      try {
        // Open-Meteo (no key, CORS-ready)
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m&hourly=precipitation_probability&timezone=auto`;
        const r = await fetch(url);
        const j = await r.json();

        const tempC = j?.current?.temperature_2m ?? null;

        // crude “next 2 hours” read if available
        let precipNext2h = null;
        if (Array.isArray(j?.hourly?.precipitation_probability)) {
          precipNext2h = Math.max(...j.hourly.precipitation_probability.slice(0, 2));
        }

        if (!cancelled) setState({ loading: false, error: null, tempC, precipNext2h });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: "weather-failed", tempC: null, precipNext2h: null });
      }
    };

    if (!("geolocation" in navigator)) {
      setState({ loading: false, error: "no-geo", tempC: null, precipNext2h: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => go(pos.coords.latitude, pos.coords.longitude),
      () => setState({ loading: false, error: "denied", tempC: null, precipNext2h: null }),
      { enableHighAccuracy: true, timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default function HomePage({ tasks = [], reminders = [] }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = "Čika Dule";

  // small bank of grounded, calm quotes (can expand later)
  const quotes = [
    "Slow is smooth. Smooth is fast.",
    "Clarity comes from making, not thinking about making.",
    "Craft is the love you leave inside the work.",
    "Do the most important thing, then stop.",
    "Small, consistent steps beat heroic sprints.",
    "Attention is your rarest resource—spend it well.",
  ];
  const quote = useMemo(
    () => quotes[new Date().getDate() % quotes.length],
    // change once a day
    [] // stable for the session is fine; we can rotate on mount
  );

  // compute “today” buckets
  const isToday = (d) => {
    const a = new Date(d);
    const b = new Date();
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const todayTasks = tasks.filter((t) => t.due && isToday(t.due));
  const todayReminders = reminders.filter((r) => r.scheduledAt && isToday(r.scheduledAt));

  const weather = useGeolocatedWeather();

  return (
    <div className="h-full w-full grid" style={{ gridTemplateRows: "1fr auto" }}>
      {/* Center greeting */}
      <section className="place-self-center text-center px-6">
        <h1 className="text-[38px] md:text-[48px] leading-tight font-semibold text-zinc-100">
          {greeting} <span className="text-white/90">{name}</span>
        </h1>
        <p className="mt-3 text-lg text-zinc-400 max-w-xl">
          {quote}
        </p>
      </section>

      {/* Bottom widgets row */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
          <WeatherCard weather={weather} />
          <TodayList
            title="Today's Tasks"
            empty="No tasks scheduled for today."
            items={todayTasks.map((t) => ({
              id: t.id,
              primary: t.title,
              secondary: new Date(t.due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }))}
          />
          <TodayList
            title="Today's Reminders"
            empty="No reminders for today."
            items={todayReminders.map((r) => ({
              id: r.id,
              primary: r.title,
              secondary: new Date(r.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function TodayList({ title, items, empty }) {
  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-black/40 p-4">
      <div className="text-sm text-zinc-400 uppercase tracking-widest mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-zinc-500 text-sm">{empty}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.slice(0, 6).map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2"
            >
              <span className="text-sm text-zinc-100 truncate">{it.primary}</span>
              {it.secondary && (
                <span className="text-xs text-zinc-500 shrink-0 ml-3">{it.secondary}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeatherCard({ weather }) {
  // interpret precipitation signal
  const rainMsg =
    weather.loading
      ? "Fetching weather…"
      : weather.error
      ? (weather.error === "denied" ? "Location denied." :
         weather.error === "no-geo" ? "No geolocation available." :
         "Weather unavailable.")
      : (weather.precipNext2h ?? 0) > 50
      ? "Rain likely in the next 2 hours"
      : "No rain is expected in the next 2 hours";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-800/70 bg-black/60 p-4">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="text-4xl font-semibold tabular-nums">
          {weather.tempC != null ? Math.round(weather.tempC) : "--"}°
        </div>
        <div className="text-right leading-snug">
          <div className="text-zinc-300 text-base">{rainMsg}</div>
        </div>
      </div>

      {/* Halftone cloud */}
      <div className="mt-2 h-28 relative rounded-2xl">
        <div
          className="absolute inset-0"
          style={{
            // dotted fill
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.95) 1.2px, transparent 1.2px)",
            backgroundSize: "6px 6px",
            // mask a simple cloud silhouette (inline SVG path)
            WebkitMaskImage:
              "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'>\
<path d='M300 160c28 0 50-22 50-50s-22-50-50-50c-8 0-16 2-23 6C268 44 243 30 214 30c-36 0-66 26-72 60-4-2-9-3-14-3-18 0-33 12-38 29-23 1-42 20-42 44 0 24 20 44 44 44h208z' fill='black'/></svg>\")",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",
            maskImage:
              "url(\"data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'>\
<path d='M300 160c28 0 50-22 50-50s-22-50-50-50c-8 0-16 2-23 6C268 44 243 30 214 30c-36 0-66 26-72 60-4-2-9-3-14-3-18 0-33 12-38 29-23 1-42 20-42 44 0 24 20 44 44 44h208z' fill='black'/></svg>\")",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
          }}
        />
      </div>

      {/* hourly ticks strip (purely visual) */}
      <div className="mt-3 grid grid-cols-4 text-center text-zinc-500 text-sm/6">
        {["13:00", "14:00", "15:00", "16:00"].map((t) => (
          <div key={t} className="border-l border-zinc-800 first:border-l-0">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

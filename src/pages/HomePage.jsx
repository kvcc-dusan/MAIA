// src/components/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
import Dither from "../components/Dither.jsx";


/* -------------------------------------------
   Helpers
------------------------------------------- */
function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 22) return "Good evening";
  return "Good night";
}
// ---- Dither background tuning ----
const BG_PRESETS = {
  charcoal: {
    waveColor: [0.40, 0.40, 0.40],
    waveAmplitude: 0.28,
    waveFrequency: 3.6,
    waveSpeed: 0.01,
    colorNum: 4,
    pixelSize: 2,
    overlayClass: "bg-black/60", // darker = /50, lighter = /20
  },
  duskBlue: {
    waveColor: [0.32, 0.45, 0.90],
    waveAmplitude: 0.22,
    waveFrequency: 3.2,
    waveSpeed: 0.01,
    colorNum: 5,
    pixelSize: 1,
    // gentle top-to-bottom fade for readability
    overlayClass: "bg-gradient-to-b from-black/60 via-transparent to-black/40",
  },
  vanta: {
    waveColor: [0.15, 0.18, 0.20],
    waveAmplitude: 0.35,
    waveFrequency: 3.8,
    waveSpeed: 0.008,
    colorNum: 3,
    pixelSize: 3,
    overlayClass: "bg-black/80",
  },
};

// pick your preset:
const BG = BG_PRESETS.charcoal;

const QUOTES = [
  "Small, consistent steps beat heroic sprints.",
  "Clarity comes from writing. Write to see.",
  "Protect your focus; it protects your future.",
  "Elegance lives where power meets restraint.",
  "Move one important thing forward every day.",
  "Less but better.",
  "Slow is smooth. Smooth is fast.",
  "You do not rise to the level of your goals; you fall to the level of your systems.",
  "Make it work. Make it right. Make it fast.",
  "Perfect is the enemy of good.",
  "Simplicity is the ultimate sophistication.",
  "Everything should be made as simple as possible, but not simpler.",
  "A problem well stated is a problem half solved.",
  "Discipline equals freedom.",
  "What gets measured gets managed.",
  "The obstacle is the way.",
  "Hurry slowly.",
  "Measure twice, cut once.",
  "Fortune favors the prepared mind.",
  "Genius is 1% inspiration and 99% perspiration.",
  "The best way out is always through.",
  "The main thing is to keep the main thing the main thing.",
  "If you can’t explain it simply, you don’t understand it well enough.",
  "The first principle is that you must not fool yourself.",
  "All models are wrong, but some are useful.",
  "The map is not the territory.",
  "Nature is pleased with simplicity.",
  "We are what we repeatedly do. Excellence, then, is a habit.",
  "He who has a why to live can bear almost any how.",
  "Between stimulus and response there is a space.",
  "What we know is a drop; what we don’t know is an ocean.",
  "The beginning is the most important part of the work.",
  "The man who moves a mountain begins by carrying away small stones.",
  "Courage is grace under pressure.",
  "Beware the barrenness of a busy life.",
  "Concentrate all your thoughts upon the work at hand.",
  "Do first what matters most.",
  "Order and simplification are the first steps toward mastery.",
  "In the middle of difficulty lies opportunity.",
  "Action is the antidote to anxiety.",
  "Saying no is a strategy, not a mood.",
  "What you practice grows stronger.",
  "Work deeply. Guard the shallow.",
  "Write it down or it didn’t happen.",
  "Coffee. Calm. Code.",
  "Progress loves quiet.",
  "Start where you are. Use what you have. Do what you can.",
  "The way to get started is to quit talking and begin doing.",
  "Focus is a verb.",
  "Sharpen the axe; then swing.",
  "Direction beats speed.",
  "Tiny changes, remarkable results.",
  "Energy goes where attention flows.",
  "Amateurs talk strategy; professionals build habits.",
  "Design is how it works.",
  "Subtract until it sings.",
  "Quality is not an act; it is a habit.",
  "Make time; don’t find it.",
  "Ship it, learn, improve.",
  "Protect the morning; it protects the day.",
  "Trust the process; test the result.",
  "Consistency compounds.",
];


function quoteForToday() {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return QUOTES[hash % QUOTES.length];
}

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
  } catch { }

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
  } catch { }

  return null; // last resort
}

/* -------------------------------------------
   Mini world map with timezone highlight
------------------------------------------- */
function WorldMiniMap({ width = 540, height = 210, coords }) {
  // ---- knobs (tweak these) ----
  const PAD = -12; // inner padding inside the rounded panel
  // Crop so Americas are left and East Asia right; hide Antarctica.
  const BOUNDS = { west: -180, east: 180, south: -20, north: 80 };

  const land = useMemo(() => feature(land110, land110.objects.land), []);

  // Fit the chosen lon/lat bounds exactly into the SVG rect (with PAD)
  const projection = useMemo(() => {
    const proj = geoMercator();
    const frame = {
      type: "Polygon",
      coordinates: [[
        [BOUNDS.west, BOUNDS.south],
        [BOUNDS.east, BOUNDS.south],
        [BOUNDS.east, BOUNDS.north],
        [BOUNDS.west, BOUNDS.north],
        [BOUNDS.west, BOUNDS.south],
      ]],
    };
    return proj.fitExtent([[PAD, PAD], [width - PAD, height - PAD]], frame);
  }, [width, height]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);

  // Timezone band (±7.5° around local meridian)
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  const centerLon = offsetHours * 15;
  const x1 = projection([centerLon - 7.5, 0])?.[0] ?? 0;
  const x2 = projection([centerLon + 7.5, 0])?.[0] ?? width;
  const bandX = Math.min(x1, x2);
  const bandW = Math.abs(x2 - x1);

  // Your position
  const dotXY = coords ? projection([coords.lon, coords.lat]) : null;
  const PULSE_MS = 1800; // ← tweak this for faster/slower pulsing

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* clip so grid/land never bleed outside the rounded panel */}
        <clipPath id="wmMask">
          <rect x="0" y="0" width={width} height={height} rx="18" />
        </clipPath>
      </defs>

      <g clipPath="url(#wmMask)">
        {/* faint grid */}
        <path
          d={path(graticule)}
          fill="none"
          stroke="#3f3f46"
          strokeOpacity="0.2"
          strokeWidth="0.7"
        />

        {/* timezone band */}
        <rect x={bandX} y="0" width={bandW} height={height} fill="#fff" opacity="0.0" />

        {/* land */}
        <path
          d={path(land)}
          fill="#242424"
          stroke="#4b5563"
          strokeOpacity="0.0"
          strokeWidth="0.8"
        />

        {dotXY && (
          <g>
            {/* solid dot that breathes */}
            <circle cx={dotXY[0]} cy={dotXY[1]} r="5" fill="#fff">
              <animate
                attributeName="opacity"
                values="0;1;0"   // fade in, fade out
                dur={`${PULSE_MS}ms`}  // speed control
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

      </g>
    </svg>
  );
}


/* -------------------------------------------
   Weather + Time Card
------------------------------------------- */
function WeatherTimeCard({ snapshot }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-5 w-full">
      <div className="flex items-end justify-between mb-4">
        <div className="text-4xl font-light text-white tracking-tight">
          {snapshot?.temp != null ? Math.round(snapshot.temp) + "°" : "--"}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-mono mb-1 uppercase tracking-wider">{snapshot?.place || "—"}</div>
          <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{tz}</div>
        </div>
      </div>

      {/* World mini map */}
      <div className="w-full h-[180px] rounded-xl bg-black/20 border border-white/5 overflow-hidden relative grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
        <WorldMiniMap width={540} height={210} coords={snapshot?.coords} />
      </div>

      <div className="mt-4 flex justify-between items-center border-t border-white/5 pt-3">
        <div className="text-xs text-zinc-400 font-mono">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="text-xs text-zinc-500 font-mono tracking-widest">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------
   Today cards
------------------------------------------- */
function TodayCard({ title, empty, children, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      className="glass-panel rounded-2xl p-5 w-full cursor-pointer hover:bg-white/5 transition-all duration-300 group"
    >
      <div className="text-[10px] tracking-[0.2em] font-bold text-zinc-600 mb-3 group-hover:text-zinc-400 transition-colors uppercase">
        {title}
      </div>
      {children ?? <div className="text-sm text-zinc-500 italic">{empty}</div>}
    </div>
  );
}


/* -------------------------------------------
   Home
------------------------------------------- */
export default function Home({ tasks = [], reminders = [], onOpenPulse }) {

  const [now, setNow] = useState(new Date());
  const [quote, setQuote] = useState(quoteForToday());
  const [weatherSnap, setWeatherSnap] = useState(null);
  const openPulse = () => onOpenPulse?.();
  // live clock & greeting update
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // rotate quote at midnight (check every minute)
  useEffect(() => {
    const t = setInterval(() => setQuote(quoteForToday()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = `${greetingFor(now)} Dušan.`; // <- tweak the name freely

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
        } catch (_) { }

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
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Main Content: Centered Glass Panel */}
      <div className="w-full max-w-4xl mx-auto px-6">
        {/* Greeting Section */}
        <div className="mb-12 text-center">
          <h1 className="font-mono text-white leading-tight text-4xl md:text-5xl tracking-tight mb-4">
            {greeting}
          </h1>
          <p className="text-zinc-500 text-sm max-w-xl mx-auto leading-relaxed font-mono">
            {quote}
          </p>
        </div>

        {/* Glass Panel with Widgets */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Weather Widget */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Weather</div>
              <div className="text-3xl font-light text-white">{weatherSnap?.temp != null ? Math.round(weatherSnap.temp) + "°" : "--"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-300">{weatherSnap?.place || "Unknown"}</div>
                <div className="text-xs text-zinc-600 font-mono">Local</div>
              </div>
              {weatherSnap?.icon && (
                <div className="text-4xl opacity-60">{weatherSnap.icon}</div>
              )}
            </div>
          </div>

          {/* Today's Focus Widget */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Today's Focus</div>
              <button onClick={openPulse} className="text-xs text-zinc-400 hover:text-white transition-colors">
                OPEN CHRONOS
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div
                onClick={openPulse}
                className="px-4 py-6 border border-dashed border-white/5 rounded-lg text-center text-xs text-zinc-600 cursor-pointer hover:border-white/10 hover:bg-white/5 transition-all"
              >
                No tasks for today.
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full ${t.done ? "bg-zinc-600" : "bg-white"}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${t.done ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                        {t.title}
                      </div>
                      {t.due && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {new Date(t.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminders Widget */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Reminders</div>
            {todayReminders.length === 0 ? (
              <div className="px-4 py-4 text-xs text-zinc-600 italic">Clean slate.</div>
            ) : (
              <div className="space-y-2">
                {todayReminders.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <div className="flex-1">
                      <div className="text-sm text-zinc-300">{r.title}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Time Display */}
        <div className="mt-6 text-center">
          <div className="text-xs text-zinc-600 font-mono">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

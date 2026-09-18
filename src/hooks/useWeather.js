import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS } from "../lib/constants.js";

// "YYYY-MM-DDTHH:00" in UTC
function localHourISO(date = new Date()) {
  return date.toISOString().slice(0, 13) + ":00";
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
    `&hourly=temperature_2m,precipitation_probability,weathercode&timezone=UTC`;
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

/**
 * @typedef {Object} WeatherData
 * @property {number} [temp] - Temperature in degrees Celsius
 * @property {string} [condition] - Weather condition description (e.g., "Clear", "Rain")
 * @property {number[]} [next2hProb] - Precipitation probability for the next 2 hours
 * @property {string} [place] - Reversed geocoded place name
 * @property {{lat: number, lon: number}} coords - Coordinates used for the data
 */

/**
 * Custom hook to fetch weather data from Open-Meteo.
 * Handles geolocation, caching (via state), and periodic updates.
 *
 * Location strategy: the first successful fix is kept for the session and
 * persisted to localStorage. The desktop app has no geolocation provider at
 * all and browsers deny/timeout regularly — in those cases we fall back to the
 * last-good fix instead of sitting on "Locating…" forever, and only surface a
 * real error when there has never been one.
 *
 * @returns {{
 *   weather: WeatherData | null,
 *   loading: boolean,
 *   error: Error | null,
 *   refresh: () => Promise<void>
 * }}
 */
function readCachedCoords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEATHER_COORDS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lon)) return parsed;
  } catch {
    // corrupt cache is as good as no cache
  }
  return null;
}

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  // Session-level fix: resolved once, reused by the 10-minute refreshes so we
  // don't re-prompt for permission on every cycle.
  const coordsRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    // Only set loading if mounted
    if (mountedRef.current) setLoading(true);

    try {
      if (!coordsRef.current) {
        coordsRef.current = await new Promise((resolve, reject) => {
          if (!("geolocation" in navigator)) return reject(new Error("no geo"));
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => reject(new Error("denied")),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }).catch(() => readCachedCoords());
      }
      const coords = coordsRef.current;

      if (!coords) {
        const err = new Error("No location available");
        if (mountedRef.current) {
          setError(err);
          setWeather(null);
        }
        return;
      }

      const w = await fetchWeather(coords);

      // Which hour is "now" in returned local timeline
      const nowKey = localHourISO(new Date());
      const times = w.hourly?.time || [];
      const idx = times.findIndex((t) => t.startsWith(nowKey));

      const next2 = [];
      if (idx !== -1) {
        for (let i = 0; i < 2; i++) {
          const v = w.hourly?.precipitation_probability?.[idx + i] ?? 0;
          next2.push(Number(v) || 0);
        }
      }

      let place = null;
      try {
        const p = await reverseGeocode(coords);
        if (p) place = p;
      } catch {
        // ignore
      }

      if (mountedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEYS.WEATHER_COORDS, JSON.stringify(coords));
        } catch {
          // quota/private mode: the session fix still works, it just won't
          // survive a reload
        }
        setWeather({
          temp: idx !== -1 ? w.hourly?.temperature_2m?.[idx] : undefined,
          condition: idx !== -1 ? getWeatherLabel(w.hourly?.weathercode?.[idx]) : undefined,
          next2hProb: next2,
          place: place || undefined,
          coords,
        });
        setError(null);
      }
    } catch (err) {
      // Logic from HomePage: if error, set weather to null
      if (mountedRef.current) {
        console.error(err);
        setError(err);
        setWeather(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { weather, loading, error, refresh };
}

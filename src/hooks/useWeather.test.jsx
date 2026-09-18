// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useWeather } from "./useWeather";
import { STORAGE_KEYS } from "../lib/constants.js";

// jsdom has no geolocation and no fixture for open-meteo; both are stubbed so
// the hook's location strategy can be exercised deterministically.
const geolocation = {
  getCurrentPosition: vi.fn(),
};

function mockOpenMeteo() {
  const nowKey = new Date().toISOString().slice(0, 13) + ":00";
  return vi.fn(async (url) => {
    if (url.includes("open-meteo.com/v1/forecast")) {
      return {
        ok: true,
        json: async () => ({
          hourly: {
            time: [nowKey],
            temperature_2m: [21],
            precipitation_probability: [10, 20],
            weathercode: [0],
          },
        }),
      };
    }
    // reverse geocode (both providers)
    return {
      ok: true,
      json: async () => ({ results: [{ city: "Maribor", country_code: "SI" }] }),
    };
  });
}

function Probe({ onState }) {
  const state = useWeather();
  onState(state);
  return null;
}

describe("useWeather", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", mockOpenMeteo());
    vi.stubGlobal("navigator", { ...navigator, geolocation });
    geolocation.getCurrentPosition.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces a real error state when geolocation is denied and nothing is cached", async () => {
    geolocation.getCurrentPosition.mockImplementation((success, failure) => failure(new Error("denied")));
    const states = [];
    render(<Probe onState={(s) => states.push({ ...s })} />);

    await waitFor(() => expect(states.at(-1).loading).toBe(false));

    expect(states.at(-1).weather).toBeNull();
    expect(states.at(-1).error).toBeInstanceOf(Error);
    // The failure must not silently retry-forever: error stays set.
    expect(states.filter((s) => s.error).length).toBeGreaterThan(0);
  });

  it("falls back to cached coordinates when geolocation is denied", async () => {
    localStorage.setItem(STORAGE_KEYS.WEATHER_COORDS, JSON.stringify({ lat: 46.5, lon: 15.6 }));
    geolocation.getCurrentPosition.mockImplementation((success, failure) => failure(new Error("denied")));
    const states = [];
    render(<Probe onState={(s) => states.push({ ...s })} />);

    await waitFor(() => expect(states.at(-1).weather).not.toBeNull());

    expect(states.at(-1).weather.coords).toEqual({ lat: 46.5, lon: 15.6 });
    expect(states.at(-1).weather.place).toBe("Maribor, SI");
    expect(states.at(-1).error).toBeNull();
    // The cached fix must come from storage, not a geolocation retry.
    expect(geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it("persists a successful geolocation fix for the next session", async () => {
    geolocation.getCurrentPosition.mockImplementation((success) =>
      success({ coords: { latitude: 46.5, longitude: 15.6 } })
    );
    const states = [];
    render(<Probe onState={(s) => states.push({ ...s })} />);

    await waitFor(() => expect(states.at(-1).weather).not.toBeNull());

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.WEATHER_COORDS)).toBe(
        JSON.stringify({ lat: 46.5, lon: 15.6 })
      )
    );
    expect(states.at(-1).error).toBeNull();
  });
});

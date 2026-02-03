import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
import GlassSurface from "./GlassSurface";

/**
 * WorldMapWidget Component
 *
 * Renders a stylized, interactive map widget using D3.js and TopoJSON.
 * It features a real-time clock, weather display placeholders, and a pulsing location dot.
 *
 * @param {Object} props
 * @param {Object} props.weather - Weather data object { coords, temp, place }
 */
export default function WorldMapWidget({ weather }) {
    const { coords, temp, place } = weather || {};

    // --- Real-time Clock ---
    // Updates every second to display current time in the footer.
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Formatters for Date/Time display
    const dayName = now.toLocaleDateString("en-US", { weekday: 'long' });
    const monthDay = now.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const yearShort = now.getFullYear().toString().slice(-2);
    const dateStr = `${dayName}, ${monthDay}, ${yearShort}`;

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // --- D3 Map Logic ---

    // 1. Data Preparation:
    // Extract GeoJSON features from the TopoJSON 'land-110m' dataset.
    // Memoized to prevent expensive re-parsing on every render.
    const mapData = useMemo(() => {
        console.log("DEBUG: land110 raw", land110);
        if (!land110 || !land110.objects) {
            console.error("DEBUG: land110 missing or no objects");
            return null;
        }
        // 'feature' converts TopoJSON topology to standard GeoJSON
        return feature(land110, land110.objects.land);
    }, []);

    // 2. Projection & Path Generation:
    // Calculates the SVG path data for the map and the screen coordinates for the location dot.
    const { pathD, dotPos } = useMemo(() => {
        const width = 300;
        const height = 180; // Taller internal canvas for better centering

        // Projection Setup:
        // 'geoEquirectangular' is a simple cylindrical projection.
        // We focus specifically on Europe by centering at [15, 52] and zooming in (scale 600).
        const projection = geoEquirectangular()
            .scale(600)
            .center([15, 52])
            .translate([width / 2, height / 2]);

        // Create a path generator bound to the projection
        const pathGenerator = geoPath().projection(projection);
        const pathD = mapData ? pathGenerator(mapData) : "";
        console.log("DEBUG: pathD result", pathD);

        // Location Dot Calculation:
        // Projects the real-world longitude/latitude to SVG x/y coordinates.
        let dotPos = null;
        if (coords) {
            const [x, y] = projection([coords.lon, coords.lat]);
            // Clip: Only show dot if it falls within reasonable bounds of the widget
            if (x > -20 && x < width + 20 && y > -20 && y < height + 20) {
                dotPos = { x, y };
            }
        }

        return { pathD, dotPos };
    }, [mapData, coords]);


    // Styles
    // The visual theme relies on dark translucent layers ('GlassSurface').
    // The map uses a dark fill to blend with the header, creating a seamless look.

    return (
        <GlassSurface className="p-0 flex flex-col w-full overflow-hidden relative min-h-[220px] bg-black/40">

            <div className="flex flex-col w-full h-full">

                {/* HEADER: Weather & Location Info */}
                <div className="flex justify-between items-start p-5 pb-3 bg-black/40 z-20 relative">
                    <div className="flex flex-col">
                        <span className="text-4xl font-light text-white tracking-tighter">
                            {temp ? `${Math.round(temp)}°` : "--"}
                        </span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                        <div className="text-sm text-zinc-300 font-medium tracking-wide">
                            {place ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "") : "Locating..."}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-1">
                            EUROPE/LJUBLJANA
                        </div>
                    </div>
                </div>

                {/* CENTER SECTION: The Map (SVG) */}
                <div className="flex-1 relative w-full overflow-hidden bg-transparent">
                    {/* Centered SVG container */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 300 180" className="w-[110%] h-[110%] opacity-100" preserveAspectRatio="xMidYMid slice">
                            {/*
                                Map Path:
                                - Fill: Black with 50% opacity to sit subtly in the background.
                                - Stroke: Very faint white outline for definition.
                            */}
                            <path d={pathD} fill="black" fillOpacity="0.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" />

                            {/* Location Dot with Pulsing Effect */}
                            {dotPos && (
                                <g>
                                    {/* Pulse Animation:
                                        Uses SVG SMIL animations to expand radius and fade opacity loop.
                                    */}
                                    <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#10b981">
                                        <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" begin="0s" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                        <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" begin="0s" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                    </circle>
                                    {/* Static center anchor */}
                                    <circle cx={dotPos.x} cy={dotPos.y} r="3" fill="#10b981" />
                                </g>
                            )}
                        </svg>
                    </div>
                </div>

                {/* FOOTER: Date & Time */}
                <div className="p-4 py-3 bg-black/40 flex justify-between items-center z-20 relative">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-mono tracking-wide">{dateStr}</span>
                    </div>
                    <span className="text-xs text-zinc-300 font-mono tracking-wide">{timeStr}</span>
                </div>
            </div>

        </GlassSurface>
    );
}

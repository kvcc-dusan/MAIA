import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import GlassSurface from "./GlassSurface";

export default function WorldMapWidget({ weather }) {
    const { coords, temp, place } = weather || {};

    // Real-time clock
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Formatters
    const dayName = now.toLocaleDateString("en-US", { weekday: 'long' });
    const monthDay = now.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const yearShort = now.getFullYear().toString().slice(-2);
    const dateStr = `${dayName}, ${monthDay}, ${yearShort}`;

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // D3 Map Logic
    const mapData = useMemo(() => {
        return feature(land110, land110.objects.land);
    }, []);

    const { pathD, dotPos } = useMemo(() => {
        const width = 300;
        const height = 180; // Taller internal canvas for better centering

        // Focus on Europe (Slovenia roughly 15E, 46N)
        // Zoomed in (scale 600) and centered
        const projection = geoEquirectangular()
            .fitSize([width, height], mapData);

        const pathGenerator = geoPath().projection(projection);
        const pathD = pathGenerator(mapData);

        let dotPos = null;
        if (coords) {
            const [x, y] = projection([coords.lon, coords.lat]);
            // Only show dot if it projects within reasonable bounds (crude clip)
            if (x > -20 && x < width + 20 && y > -20 && y < height + 20) {
                dotPos = { x, y };
            }
        }

        return { pathD, dotPos };
    }, [mapData, coords]);


    // Styles
    // Header/Footer/Map match color: using a dark gray/black with high opacity
    const SECTION_BG = "bg-[#18181b]"; // zinc-900 like
    const MAP_FILL = "#18181b"; // Matching the background for "negative space" feel or slightly lighter?
    // User asked: "match the exact same texture and color of the map... as the header background"
    // If we make the land the same color as the header, and the "ocean" is transparent...
    // Actually the user probably means the "ocean" should be the color of the header, and land is ...?
    // "let's make also the map be the same texture and color as the header background" -> This implies the map SHAPE is that color.
    // If the map shape is that color, what is the background? 
    // Re-reading: "map be the same texture and color as the header background... so not the map background, but the map itself."
    // So Land = Dark Header Color. Background = Transparent?
    // If Land is Dark Header Color (dark gray), and it sits on a GlassSurface (dark), it might be invisible.
    // Unless the GlassSurface is lighter?
    // Let's try: Land = Header Color (#1f1f22 approx). Map container background = slightly lighter or transparent.
    // Actually, usually "Header" is darker than "Body".
    // If Land matches Header, and Header is dark... 
    // Let's assume Land = #27272a (zinc-800) and Header BG = #27272a.

    return (
        <GlassSurface className="p-0 flex flex-col w-full overflow-hidden relative min-h-[220px] bg-black/40">

            <div className="flex flex-col w-full h-full">

                {/* HEADER: Weather & Location Info */}
                {/* Darker background as requested */}
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

                {/* CENTER SECTION: The Map (Clip Content) */}
                <div className="flex-1 relative w-full overflow-hidden bg-transparent">
                    {/* 
                  Clip container: absolute inset to ensure map doesn't overflow header/footer visually 
                  if we want strict clipping. But flex-1 does that.
               */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 300 180" className="w-[110%] h-[110%] opacity-100" preserveAspectRatio="xMidYMid slice">
                            {/* Land: Zinc-700 (#3f3f46) for subtle contrast, White stroke (0.25) for definition */}
                            <path d={pathD} fill="#3f3f46" fillOpacity="1" stroke="white" strokeWidth="0.5" strokeOpacity="0.25" />

                            {/* Location Dot */}
                            {dotPos && (
                                <g>
                                    {/* Pulse: Expand (r 4->12) and Fade Out (opacity 0.6->0) */}
                                    <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#10b981">
                                        <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" begin="0s" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                        <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" begin="0s" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                    </circle>
                                    {/* Static center dot */}
                                    <circle cx={dotPos.x} cy={dotPos.y} r="3" fill="#10b981" />
                                </g>
                            )}
                        </svg>
                    </div>
                </div>

                {/* FOOTER: Date & Time */}
                {/* Darker background matching header */}
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

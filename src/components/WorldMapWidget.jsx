import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
import GlassSurface from "./GlassSurface";

const MapVisual = React.memo(({ weather }) => {
    const { coords } = weather || {};

    // D3 Map Logic
    const mapData = useMemo(() => {
        if (!land110 || !land110.objects) {
            return null;
        }
        return feature(land110, land110.objects.land);
    }, []); // land110 is static import

    const { pathD, dotPos } = useMemo(() => {
        const width = 300;
        const height = 180; // Taller internal canvas for better centering

        // Focus on Europe (Slovenia roughly 15E, 46N)
        // Zoomed in (scale 600) and centered
        const projection = geoEquirectangular()
            .scale(600)
            .center([15, 52])
            .translate([width / 2, height / 2]);

        const pathGenerator = geoPath().projection(projection);
        const pathD = mapData ? pathGenerator(mapData) : "";

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

    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 300 180" className="w-[110%] h-[110%] opacity-100" preserveAspectRatio="xMidYMid slice">
                {/* Land: Using a color that matches the dark header vibe */}
                <path d={pathD} fill="black" fillOpacity="0.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" />

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
    );
});

export default function WorldMapWidget({ weather }) {
    const { temp, place } = weather || {};

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
                    <MapVisual weather={weather} />
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

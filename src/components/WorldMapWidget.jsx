import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
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
    const dateStr = now.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // D3 Map Logic
    const mapData = useMemo(() => {
        return feature(land110, land110.objects.land);
    }, []);

    const { pathD, graticuleD, dotPos } = useMemo(() => {
        // Canvas dimensions (viewBox used for SVG scaling)
        const width = 300;
        const height = 150;

        const projection = geoEquirectangular()
            .fitSize([width, height], mapData)
            .translate([width / 2, height / 2 + 10]); // Nudge down slightly

        const pathGenerator = geoPath().projection(projection);
        const graticuleGenerator = geoPath().projection(projection);

        const pathD = pathGenerator(mapData);
        const graticuleD = graticuleGenerator(geoGraticule10());

        let dotPos = null;
        if (coords) {
            const [x, y] = projection([coords.lon, coords.lat]);
            dotPos = { x, y };
        }

        return { pathD, graticuleD, dotPos };
    }, [mapData, coords]);


    return (
        <GlassSurface className="p-0 flex flex-col w-full overflow-hidden relative min-h-[160px]">

            {/* Header Info */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">

                {/* Left: Temp */}
                <div className="flex flex-col">
                    <span className="text-3xl font-light text-white tracking-tighter">
                        {temp ? `${Math.round(temp)}°` : "--"}
                    </span>
                </div>

                {/* Right: Location & TZ */}
                <div className="flex flex-col items-end text-right">
                    <div className="text-xs text-zinc-300 font-medium tracking-wide">
                        {place ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "") : "Locating..."}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">
                        {timeZone}
                    </div>
                </div>
            </div>

            {/* Map Layer */}
            <div className="w-full flex-1 relative flex items-center justify-center bg-black/40">
                {/* Grid Overlay Texture (CSS pattern if desired, but simple SVG graticule below) */}

                <svg viewBox="0 0 300 150" className="w-full h-full opacity-60">
                    {/* Graticule */}
                    <path d={graticuleD} fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
                    {/* Land */}
                    <path d={pathD} fill="#1e293b" fillOpacity="0.8" />

                    {/* Location Dot */}
                    {dotPos && (
                        <g>
                            <circle cx={dotPos.x} cy={dotPos.y} r="3" fill="#ffffff" fillOpacity="0.8">
                                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="fill-opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={dotPos.x} cy={dotPos.y} r="1.5" fill="#ffffff" />
                        </g>
                    )}
                </svg>
            </div>

            {/* Footer: Date & Time */}
            <div className="absolute bottom-0 w-full p-3 bg-black/20 border-t border-white/5 backdrop-blur-sm flex justify-between items-center z-10">
                <span className="text-[10px] text-zinc-400 font-mono tracking-wide">{dateStr}</span>
                <span className="text-[10px] text-zinc-300 font-mono tracking-wide">{timeStr}</span>
            </div>

        </GlassSurface>
    );
}

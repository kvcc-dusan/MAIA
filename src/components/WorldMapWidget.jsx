import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
import GlassSurface from "./GlassSurface";

const TECH_HUBS = [
    { name: "San Francisco", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles" },
    { name: "New York", lat: 40.7128, lon: -74.0060, tz: "America/New_York" },
    { name: "London", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
];

export default function WorldMapWidget({ weather }) {
    const { coords, temp, place } = weather || {};
    const [hoveredHub, setHoveredHub] = useState(null);

    // Real-time clock
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Formatters
    // "Sunday, Feb 1, 26"
    const dayName = now.toLocaleDateString("en-US", { weekday: 'long' });
    const monthDay = now.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const yearShort = now.getFullYear().toString().slice(-2);
    const dateStr = `${dayName}, ${monthDay}, ${yearShort}`;

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // D3 Map Logic
    const mapData = useMemo(() => {
        return feature(land110, land110.objects.land);
    }, []);

    const { pathD, graticuleD, dotPos, hubPositions } = useMemo(() => {
        // Adjusted dimensions for the middle section
        const width = 300;
        const height = 140; // Slightly shorter to fit in middle section gracefully

        // Fit strictly to this box
        const projection = geoEquirectangular()
            .fitSize([width, height], mapData)
            .translate([width / 2, height / 2]);

        const pathGenerator = geoPath().projection(projection);
        const graticuleGenerator = geoPath().projection(projection);

        const pathD = pathGenerator(mapData);
        const graticuleD = graticuleGenerator(geoGraticule10());

        let dotPos = null;
        if (coords) {
            const [x, y] = projection([coords.lon, coords.lat]);
            dotPos = { x, y };
        }

        const hubPositions = TECH_HUBS.map(hub => {
            const [x, y] = projection([hub.lon, hub.lat]);
            return { ...hub, x, y };
        });

        return { pathD, graticuleD, dotPos, hubPositions };
    }, [mapData, coords]);

    // Derived display values
    let displayTemp = temp ? `${Math.round(temp)}°` : "--";
    let displayPlace = place ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "") : "Locating...";

    // Determine subtitle (Timezone or Status)
    let displaySub = "Scanning...";
    if (hoveredHub) {
        displayTemp = "--";
        displayPlace = hoveredHub.name;
        const hubTime = now.toLocaleTimeString("en-US", {
            timeZone: hoveredHub.tz,
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
        displaySub = `${hoveredHub.tz.split('/')[1].toUpperCase()} • ${hubTime}`;
    } else if (place) {
         // Default to user's local timezone if available
         const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone.toUpperCase();
         displaySub = userTz;
    }


    return (
        <GlassSurface className="p-0 flex flex-col w-full overflow-hidden relative min-h-[220px]">

            {/* SECTION 1: TOP - Weather & Location Info */}
            <div className="flex justify-between items-start p-5 pb-2 border-b border-white/5 bg-black/20 z-10 relative">
                {/* Left: Temp */}
                <div className="flex flex-col">
                    <span className="text-4xl font-light text-white tracking-tighter">
                        {displayTemp}
                    </span>
                </div>

                {/* Right: Location & TZ */}
                <div className="flex flex-col items-end text-right">
                    <div data-testid="widget-location" className="text-sm text-zinc-300 font-medium tracking-wide">
                        {displayPlace}
                    </div>
                    <div data-testid="widget-subtitle" className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-1">
                        {displaySub}
                    </div>
                </div>
            </div>

            {/* SECTION 2: MID - The Map */}
            <div className="flex-1 relative flex items-center justify-center w-full overflow-hidden">
                {/* Padding container to prevent edge clipping if needed */}
                <div className="w-full h-full flex items-center justify-center p-2">
                    <svg viewBox="0 0 300 140" className="w-full h-full opacity-80" preserveAspectRatio="xMidYMid meet">
                        {/* Graticule */}
                        <path d={graticuleD} fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.2" />

                        {/* Land - Pure Gray */}
                        <path d={pathD} fill="#3f3f46" />

                        {/* Tech Hubs */}
                        {hubPositions.map((hub) => (
                             <g
                                key={hub.name}
                                data-testid={`hub-${hub.name}`}
                                onMouseEnter={() => setHoveredHub(hub)}
                                onMouseLeave={() => setHoveredHub(null)}
                                className="cursor-pointer"
                             >
                                <circle cx={hub.x} cy={hub.y} r="3" fill={hoveredHub === hub ? "#60a5fa" : "#94a3b8"} fillOpacity={hoveredHub === hub ? 1 : 0.5} />
                                {/* Invisible larger target for easier hovering */}
                                <circle cx={hub.x} cy={hub.y} r="8" fill="transparent" />
                             </g>
                        ))}

                        {/* Location Dot - Emerald Green */}
                        {dotPos && (
                            <g>
                                <circle cx={dotPos.x} cy={dotPos.y} r="4" fill="#10b981" fillOpacity="0.3">
                                    <animate attributeName="r" values="4;8;4" dur="2.5s" repeatCount="indefinite" />
                                    <animate attributeName="fill-opacity" values="0.3;0.1;0.3" dur="2.5s" repeatCount="indefinite" />
                                </circle>
                                <circle cx={dotPos.x} cy={dotPos.y} r="2" fill="#10b981" stroke="#black" strokeWidth="0.5" />
                            </g>
                        )}
                    </svg>
                </div>
            </div>

            {/* SECTION 3: BOTTOM - Date & Time */}
            <div className="p-4 pt-3 bg-black/40 border-t border-white/5 backdrop-blur-md flex justify-between items-center z-10 relative">
                <span className="text-xs text-zinc-400 font-mono tracking-wide">{dateStr}</span>
                <span className="text-xs text-zinc-300 font-mono tracking-wide">{timeStr}</span>
            </div>

        </GlassSurface>
    );
}

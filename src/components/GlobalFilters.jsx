import React from "react";

const GlobalFilters = () => {
    return (
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
                <filter id="glass-filter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.012 0.012"
                        numOctaves="3"
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="2"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
        </svg>
    );
};

export default GlobalFilters;

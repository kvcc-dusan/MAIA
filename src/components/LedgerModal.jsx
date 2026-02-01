import React, { useEffect } from "react";
import GlassSurface from "./GlassSurface";
import DecisionLedger from "./DecisionLedger";

export default function LedgerModal({ onClose, ledger, setLedger }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-4xl h-[85vh] p-6" onClick={e => e.stopPropagation()}>
                <GlassSurface className="h-full w-full rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    <div className="flex-1 overflow-hidden px-6 pb-6 pt-12 md:px-8 md:pb-8 md:pt-14">
                        <DecisionLedger ledger={ledger} setLedger={setLedger} />
                    </div>
                </GlassSurface>
            </div>
        </div>
    );
}

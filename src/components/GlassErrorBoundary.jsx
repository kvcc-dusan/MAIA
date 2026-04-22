import React from 'react';
import { GlassCard } from './GlassCard';
import { Unavailable } from "./ui/CustomIcon.jsx";

export class GlassErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("GlassErrorBoundary caught an error:", error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <GlassCard className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[150px] w-full">
                    <div className="text-zinc-500 mb-4">
                        <Unavailable size={40} className="mx-auto opacity-50" />
                    </div>
                    <h3 className="text-white font-medium mb-2">Widget Unavailable</h3>
                    <p className="text-xs text-zinc-400 mb-4 max-w-[200px] break-words">
                        {this.state.error?.message || "Something went wrong."}
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                    >
                        Reload Widget
                    </button>
                </GlassCard>
            );
        }

        return this.props.children;
    }
}

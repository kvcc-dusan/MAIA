import React from 'react';
import { GlassCard } from './GlassCard';
import { logger } from '../lib/logger';

export class GlassErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error("GlassErrorBoundary caught an error:", error);
        if (errorInfo) logger.debug("Component Stack:", errorInfo.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <GlassCard className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[150px] w-full">
                    <div className="text-zinc-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
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

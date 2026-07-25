import React from 'react';
import { ErrorState } from './composed/ErrorState';

export class GlassErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, attempt: 0 };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("GlassErrorBoundary caught an error:", error, errorInfo);
    }

    // Bumping `attempt` re-keys the subtree so children actually remount.
    // Previously this only cleared `hasError`, so a deterministic error threw
    // again on the very next render and Retry appeared to do nothing.
    handleRetry = () => {
        this.setState((s) => ({ hasError: false, error: null, attempt: s.attempt + 1 }));
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorState
                    title={this.props.title || "Something went wrong"}
                    message={this.state.error?.message}
                    onRetry={this.handleRetry}
                />
            );
        }

        return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }
}

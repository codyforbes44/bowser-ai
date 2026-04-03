import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLevel?: 'app' | 'tab';
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Bowser ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isTab = this.props.fallbackLevel === 'tab';

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{
          background: 'var(--bw-bg-app, #09090b)',
          color: 'var(--bw-text-primary, #ededed)',
          width: '100%',
          height: '100%',
          minHeight: isTab ? '200px' : '100vh',
        }}
      >
        {!isTab && (
          <img src="/pwa-192x192.png" alt="Bowser" className="w-12 h-12 rounded-xl opacity-60" />
        )}
        <div>
          <h2 className="text-[15px] font-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
            {isTab ? 'This tab crashed' : 'Something went wrong'}
          </h2>
          <p className="text-[12px] max-w-sm" style={{ color: 'var(--bw-text-tertiary, #737373)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-[12px] font-medium rounded-lg"
            style={{
              background: 'var(--bw-accent, #6366f1)',
              color: '#fff',
            }}
          >
            Try Again
          </button>
          {!isTab && (
            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-[12px] font-medium rounded-lg"
              style={{
                border: '1px solid var(--bw-border, #2a2a2a)',
                color: 'var(--bw-text-secondary, #a1a1a1)',
                background: 'transparent',
              }}
            >
              Reload App
            </button>
          )}
        </div>
      </div>
    );
  }
}

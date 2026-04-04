import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StateDisplay } from './StateDisplay';
import { sanitizeHtml } from '../../lib/sanitize';

interface WebProxyProps {
  url: string;
  navigationId: number;
  onNavigate: (url: string) => void;
}

export const WebProxy: React.FC<WebProxyProps> = ({ url, navigationId, onNavigate }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);
    setStatusCode(null);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`https://${projectId}.supabase.co/functions/v1/proxy-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ url }),
    })
      .then(async (res) => {
        if (cancelled) return;
        setStatusCode(res.status);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load page');
          setLoading(false);
          return;
        }
        // Sanitize proxied HTML
        setHtml(sanitizeHtml(data.html));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Network error');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url, navigationId]);

  // Listen for navigation messages from the proxied content
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'PROXY_NAVIGATE') {
        onNavigate(event.data.url);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onNavigate]);

  const handleOpenExternal = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const handleGoHome = useCallback(() => {
    window.dispatchEvent(new Event('bowser:go-home'));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bw-bg-app)' }}>
        <StateDisplay type="loading" message="Loading page…" />
      </div>
    );
  }

  // 404 / Not Found state
  if (statusCode === 404 || error?.includes('404')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--bw-text-quaternary)', opacity: 0.5 }} aria-hidden="true">cloud_off</span>
        <div className="text-center">
          <h2 className="text-[15px] font-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>Page not found</h2>
          <p className="text-[12px] max-w-sm mb-1" style={{ color: 'var(--bw-text-tertiary)' }}>
            The page at this URL couldn't be found or doesn't exist.
          </p>
          <p className="text-[11px] font-mono break-all max-w-xs" style={{ color: 'var(--bw-text-quaternary)' }}>{url}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGoHome}
            className="px-4 py-2 text-[12px] font-medium rounded-lg"
            style={{ background: 'var(--bw-accent)', color: '#fff' }}
          >
            Go Home
          </button>
          <button
            onClick={handleOpenExternal}
            className="px-4 py-2 text-[12px] font-medium rounded-lg"
            style={{ border: '1px solid var(--bw-border)', color: 'var(--bw-text-secondary)', background: 'transparent' }}
          >
            Open in new tab ↗
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
        <StateDisplay type="error" message={`This page couldn't be loaded through the proxy: ${error}`} onRetry={handleOpenExternal} />
        <button
          onClick={handleOpenExternal}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--bw-accent)', color: '#fff' }}
          aria-label="Open in new tab"
        >
          Open in new tab ↗
        </button>
      </div>
    );
  }

  if (!html) return null;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      className="w-full h-full border-none bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms"
      title="Web content (proxied)"
    />
  );
};

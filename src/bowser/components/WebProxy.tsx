import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WebProxyProps {
  url: string;
  navigationId: number;
  onNavigate: (url: string) => void;
}

export const WebProxy: React.FC<WebProxyProps> = ({ url, navigationId, onNavigate }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);

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
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load page');
          setLoading(false);
          return;
        }
        setHtml(data.html);
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

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
        <p className="text-sm opacity-60">Loading page…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
        <span className="material-symbols-outlined text-4xl opacity-40">cloud_off</span>
        <p className="text-sm opacity-60 text-center max-w-md">
          This page couldn't be loaded through the proxy: {error}
        </p>
        <button
          onClick={handleOpenExternal}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--bw-accent)', color: '#fff' }}
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
      sandbox="allow-scripts allow-forms allow-same-origin"
      title="Web content (proxied)"
    />
  );
};

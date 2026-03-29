import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('bowser-install-dismissed') === '1'; } catch { return false; }
  });
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (!deferredPrompt || dismissed || installed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('bowser-install-dismissed', '1'); } catch {}
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg mt-4 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border)' }}
    >
      <span className="material-symbols-outlined text-xl" style={{ color: 'var(--bw-accent)' }}>download</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--bw-text-primary)' }}>Install Bowser</p>
        <p className="text-[11px]" style={{ color: 'var(--bw-text-quaternary)' }}>Add to home screen</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0"
        style={{ background: 'var(--bw-accent)', color: '#ffffff' }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-1 transition-colors"
        style={{ color: 'var(--bw-text-quaternary)' }}
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
};

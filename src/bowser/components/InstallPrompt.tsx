import React, { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => getStorageItem<boolean>('install-dismissed', false));
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', installedHandler); };
  }, []);

  if (!deferredPrompt || dismissed || installed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => { setDismissed(true); setStorageItem('install-dismissed', true); };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 mt-4 max-w-sm mx-auto"
      style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border)', borderRadius: 'var(--bw-radius-md)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--bw-accent)' }} aria-hidden="true">download</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: 'var(--bw-text-primary)' }}>Install Bowser for the best experience.</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1 text-[12px] font-medium shrink-0"
        style={{ background: 'var(--bw-accent)', color: '#fff', borderRadius: 'var(--bw-radius-sm)', transition: 'opacity 0.1s ease' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="text-[12px] font-medium"
        style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
        aria-label="Dismiss"
      >
        Not now
      </button>
    </div>
  );
};
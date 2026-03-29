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
    <div className="flex items-center gap-3 bg-[#1e1f23] px-4 py-3 rounded-2xl border border-white/10 mt-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="material-symbols-outlined text-2xl text-blue-400">download</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200">Install Bowser</p>
        <p className="text-xs text-gray-500">Add to your home screen for a native experience</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors p-1"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};

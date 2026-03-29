import React from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export const InstallPrompt: React.FC = () => {
  const { canInstall, triggerInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 mt-4 max-w-sm mx-auto"
      style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border)', borderRadius: 'var(--bw-radius-md)' }}
    >
      <span className="material-symbols-outlined icon-lg" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">download</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: 'var(--bw-text-primary)' }}>Install Bowser for the best experience.</p>
      </div>
      <button
        onClick={triggerInstall}
        className="px-3 py-1 text-[12px] font-medium shrink-0"
        style={{ background: 'var(--bw-accent)', color: '#fff', borderRadius: 'var(--bw-radius-sm)', transition: 'opacity 0.1s ease' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Install
      </button>
      <button
        onClick={dismiss}
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

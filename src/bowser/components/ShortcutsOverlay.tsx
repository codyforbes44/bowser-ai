import React from 'react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { keys: `${mod}+T`, description: 'New tab' },
  { keys: `${mod}+W`, description: 'Close tab' },
  { keys: `${mod}+L`, description: 'Focus address bar' },
  { keys: `${mod}+K`, description: 'Command palette' },
  { keys: `${mod}+Shift+T`, description: 'Reopen closed tab' },
  { keys: `${mod}+Shift+A`, description: 'Toggle assistant' },
  { keys: `${mod}+/`, description: 'Show shortcuts' },
  { keys: `${mod}+1–9`, description: 'Switch to tab' },
  { keys: 'Escape', description: 'Close panel / blur' },
];

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl overflow-hidden"
        style={{ background: 'var(--bw-bg-elevated)', border: '1px solid var(--bw-border)', boxShadow: 'var(--bw-shadow-xl)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bw-border-subtle)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.02em' }}>Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--bw-text-quaternary)' }} aria-label="Close">
            <span className="material-symbols-outlined icon-md" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="px-5 py-3 space-y-0">
          {SHORTCUTS.map((s, i) => (
            <div key={s.keys} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--bw-border-subtle)' : 'none' }}>
              <span className="text-[13px]" style={{ color: 'var(--bw-text-secondary)' }}>{s.description}</span>
              <kbd className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: 'var(--bw-bg-hover)', border: '1px solid var(--bw-border)', color: 'var(--bw-text-tertiary)', fontFamily: 'var(--bw-font-mono)' }}>
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useCallback } from 'react';
import { Tab, TabKind } from '../types';

interface TabContextMenuProps {
  tab: Tab;
  tabIndex: number;
  x: number;
  y: number;
  onClose: () => void;
  onNewTab: () => void;
  onCloseTab: (index: number) => void;
  onCloseOtherTabs: (index: number) => void;
  onDuplicateTab: (tab: Tab) => void;
  onPinTab: (tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tab, tabIndex, x, y, onClose, onNewTab, onCloseTab, onCloseOtherTabs, onDuplicateTab, onPinTab,
}) => {
  React.useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('click', handler);
    document.addEventListener('contextmenu', handler);
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('contextmenu', handler);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    { label: 'New Tab', icon: 'add', action: onNewTab },
    { label: 'Duplicate Tab', icon: 'content_copy', action: () => onDuplicateTab(tab) },
    null, // separator
    { label: tab.pinned ? 'Unpin Tab' : 'Pin Tab', icon: tab.pinned ? 'keep_off' : 'keep', action: () => onPinTab(tab.id) },
    null,
    { label: 'Close Tab', icon: 'close', action: () => onCloseTab(tabIndex), disabled: tab.pinned },
    { label: 'Close Other Tabs', icon: 'tab_close', action: () => onCloseOtherTabs(tabIndex) },
  ];

  return (
    <div
      className="fixed z-[9999] rounded-lg overflow-hidden min-w-[180px]"
      style={{
        left: Math.min(x, window.innerWidth - 200),
        top: Math.min(y, window.innerHeight - 250),
        background: 'var(--bw-bg-elevated)',
        border: '1px solid var(--bw-border)',
        boxShadow: 'var(--bw-shadow-lg)',
      }}
      role="menu"
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (!item) return <div key={`sep-${i}`} style={{ borderTop: '1px solid var(--bw-border-subtle)', margin: '4px 0' }} />;
        return (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors"
            style={{ color: item.disabled ? 'var(--bw-text-quaternary)' : 'var(--bw-text-primary)', background: 'transparent' }}
            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = 'var(--bw-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}
            disabled={item.disabled}
            role="menuitem"
          >
            <span className="material-symbols-outlined icon-sm" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

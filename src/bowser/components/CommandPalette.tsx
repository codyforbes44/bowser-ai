import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CommandAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  section: string;
  onExecute: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const sections = Array.from(new Set(filtered.map(a => a.section)));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeAction = useCallback((action: CommandAction) => {
    onClose();
    requestAnimationFrame(() => action.onExecute());
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      executeAction(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="command-palette-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <span className="material-symbols-outlined command-palette-search-icon" aria-hidden="true">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-palette-input"
            placeholder="What do you need?"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={filtered[selectedIndex] ? `cp-item-${filtered[selectedIndex].id}` : undefined}
          />
          <kbd className="command-palette-kbd" aria-hidden="true">ESC</kbd>
        </div>
        <div className="command-palette-list" ref={listRef} id="command-palette-listbox" role="listbox">
          {filtered.length === 0 && (
            <div className="command-palette-empty" role="status">No matching commands</div>
          )}
          {sections.map(section => {
            const sectionItems = filtered.filter(a => a.section === section);
            return (
              <div key={section} role="group" aria-label={section}>
                <div className="command-palette-section" aria-hidden="true">{section}</div>
                {sectionItems.map(action => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <div
                      key={action.id}
                      id={`cp-item-${action.id}`}
                      data-index={idx}
                      className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                      onClick={() => executeAction(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      role="option"
                      aria-selected={idx === selectedIndex}
                    >
                      <span className="material-symbols-outlined command-palette-item-icon" aria-hidden="true">{action.icon}</span>
                      <span className="command-palette-item-label">{action.label}</span>
                      {action.shortcut && (
                        <kbd className="command-palette-item-shortcut" aria-label={`Shortcut: ${action.shortcut}`}>{action.shortcut}</kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

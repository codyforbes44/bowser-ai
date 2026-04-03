import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TabKind } from '../types';
import { AnalysisAction } from '../services/geminiService';
import { useAIJob } from '../hooks/useAIJob';
import { StateDisplay } from './StateDisplay';

interface AiSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageHtml: string | null;
  tabKind: TabKind;
  webTabUrl?: string;
  webTabTitle?: string;
}

const AI_TAB_ACTIONS: { id: AnalysisAction; label: string; icon: string }[] = [
  { id: 'summarize', label: 'Summarize', icon: 'summarize' },
  { id: 'key-points', label: 'Key points', icon: 'list' },
  { id: 'simplify', label: 'Simplify', icon: 'edit_note' },
];

const WEB_TAB_ACTIONS: { id: AnalysisAction; label: string; icon: string }[] = [
  { id: 'summarize', label: 'Summarize topic', icon: 'summarize' },
  { id: 'key-points', label: 'Key points', icon: 'list' },
  { id: 'related', label: 'Related searches', icon: 'travel_explore' },
  { id: 'explain', label: 'Explain simply', icon: 'edit_note' },
];

export const AiSidePanel: React.FC<AiSidePanelProps> = ({
  isOpen, onClose, pageHtml, tabKind, webTabUrl, webTabTitle,
}) => {
  const [question, setQuestion] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const isWebTab = tabKind === 'web';
  const isAiTab = tabKind === 'ai';
  const isSystemTab = ['history', 'bookmarks', 'settings', 'new-tab'].includes(tabKind);
  const canAnalyzeAi = isAiTab && !!pageHtml;
  const canAnalyzeWeb = isWebTab && !!webTabUrl;
  const canAnalyze = canAnalyzeAi || canAnalyzeWeb;

  const { state, activeAction, start, abort, reset, retry } = useAIJob({
    pageHtml, isWebTab, webTabUrl, webTabTitle,
  });

  const isLoading = state.status === 'loading' || state.status === 'streaming';

  // Abort on close
  useEffect(() => { if (!isOpen) abort(); }, [isOpen, abort]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isLoading && contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [state.content, isLoading]);

  // Focus trap when open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNewConversation = useCallback(() => {
    reset();
    setQuestion('');
  }, [reset]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) start('ask', question.trim());
  };

  if (!isOpen) return null;

  const actions = isWebTab ? WEB_TAB_ACTIONS : AI_TAB_ACTIONS;

  return (
    <aside className="side-panel" role="complementary" aria-label="Assistant" ref={panelRef}>
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined icon-md" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">auto_awesome</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.01em' }}>Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {(state.content || activeAction) && (
            <button onClick={handleNewConversation} className="p-1 rounded" style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')} aria-label="New conversation" title="New conversation">
              <span className="material-symbols-outlined icon-md" aria-hidden="true">refresh</span>
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')} aria-label="Close panel">
            <span className="material-symbols-outlined icon-md" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {isSystemTab || !canAnalyze ? (
        <StateDisplay type="empty" icon="chat_bubble_outline" title={isSystemTab ? 'Nothing to discuss' : 'Open a page first'} subtitle="Open a page and ask a question, or start a conversation." />
      ) : (
        <>
          {isWebTab && state.status === 'idle' && !activeAction && (
            <div className="px-3 py-2 mx-3 mt-2 rounded" style={{ background: 'var(--bw-accent-muted)', border: '1px solid var(--bw-border-subtle)', borderRadius: 'var(--bw-radius-sm)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
                Bowser can discuss this topic based on general knowledge. It cannot read the live page content.
              </p>
            </div>
          )}

          <div className="side-panel-actions" role="toolbar" aria-label="Quick actions">
            {actions.map(a => (
              <button key={a.id} onClick={() => start(a.id)} disabled={isLoading} className={`side-panel-action ${activeAction === a.id ? 'active' : ''}`} aria-pressed={activeAction === a.id}>
                <span className="material-symbols-outlined icon-sm" aria-hidden="true">{a.icon}</span>
                <span className="text-[11px]">{a.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleAsk} className="side-panel-ask">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)} placeholder={isWebTab ? 'Ask about this topic…' : 'Ask about this page…'} className="side-panel-ask-input" disabled={isLoading} aria-label="Ask a question" />
            <button type="submit" disabled={isLoading || !question.trim()} className="side-panel-ask-btn" aria-label="Send">
              <span className="material-symbols-outlined icon-sm" aria-hidden="true">send</span>
            </button>
          </form>

          {state.status === 'error' ? (
            <div className="px-3 py-2">
              <StateDisplay type="error" message={state.error || 'Something went wrong.'} onRetry={retry} />
            </div>
          ) : (state.content || isLoading) ? (
            <div className="side-panel-response" ref={contentRef} aria-live="polite">
              {isLoading && !state.content && (
                <div className="space-y-2 py-2">
                  <div className="bw-shimmer h-3 w-full" />
                  <div className="bw-shimmer h-3 w-4/5" />
                  <div className="bw-shimmer h-3 w-3/5" />
                </div>
              )}
              <div className={`side-panel-text ${state.status === 'streaming' ? 'streaming-cursor' : ''}`}>{state.content}</div>
              {isLoading && state.content && (
                <button onClick={abort} className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium" style={{ color: 'var(--bw-text-quaternary)', border: '1px solid var(--bw-border)', transition: 'color 0.1s ease' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')} aria-label="Stop generating">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }} aria-hidden="true">stop</span>
                  Stop
                </button>
              )}
            </div>
          ) : (
            <div className="side-panel-hint">
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
                Choose an action or ask a question.
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

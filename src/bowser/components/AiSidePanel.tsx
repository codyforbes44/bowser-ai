import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TabKind } from '../types';
import { streamTextAnalysis, streamWebTabAnalysis, AnalysisAction } from '../services/geminiService';

// Simple focus trap: cycles Tab/Shift+Tab within a container
function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', handleKeyDown);
    // Focus first focusable element on open
    const firstFocusable = container.querySelector<HTMLElement>('button, input, [tabindex]');
    firstFocusable?.focus();
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active, ref]);
}

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
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<AnalysisAction | null>(null);
  const [question, setQuestion] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isWebTab = tabKind === 'web';
  const isAiTab = tabKind === 'ai';
  const isSystemTab = ['history', 'bookmarks', 'settings', 'new-tab'].includes(tabKind);
  const canAnalyzeAi = isAiTab && !!pageHtml;
  const canAnalyzeWeb = isWebTab && !!webTabUrl;
  const canAnalyze = canAnalyzeAi || canAnalyzeWeb;

  useEffect(() => { if (!isOpen) abortRef.current?.abort(); }, [isOpen]);
  useEffect(() => { if (loading && contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight; }, [response, loading]);

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setResponse(''); setError(null); setActiveAction(null); setQuestion(''); setLoading(false);
  }, []);

  const runAction = useCallback(async (action: AnalysisAction, q?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setActiveAction(action); setResponse(''); setError(null); setLoading(true);

    try {
      const stream = (isWebTab && webTabUrl)
        ? streamWebTabAnalysis(webTabUrl, webTabTitle || '', action, q, controller.signal)
        : pageHtml
          ? streamTextAnalysis(pageHtml, action, q, controller.signal)
          : null;

      if (!stream) { setError('No content available.'); setLoading(false); return; }

      let fullText = '';
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        fullText += chunk;
        setResponse(fullText);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError('Something went wrong. Please try again.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [pageHtml, isWebTab, webTabUrl, webTabTitle]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); setLoading(false); }, []);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) runAction('ask', question.trim());
  };

  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, isOpen);

  if (!isOpen) return null;

  const actions = isWebTab ? WEB_TAB_ACTIONS : AI_TAB_ACTIONS;

  return (
    <aside ref={panelRef} className="side-panel" role="complementary" aria-label="Assistant">
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined icon-md" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">auto_awesome</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.01em' }}>Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {(response || activeAction) && (
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
        <div className="side-panel-empty" role="status">
          <span className="material-symbols-outlined icon-xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">chat_bubble_outline</span>
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>
            {isSystemTab ? 'Nothing to discuss' : 'Open a page first'}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
            Open a page and ask a question, or start a conversation.
          </p>
        </div>
      ) : (
        <>
          {isWebTab && !response && !loading && (
            <div className="px-3 py-2 mx-3 mt-2 rounded" style={{ background: 'var(--bw-accent-muted)', border: '1px solid var(--bw-border-subtle)', borderRadius: 'var(--bw-radius-sm)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
                Bowser can discuss this topic based on general knowledge. It cannot read the live page content.
              </p>
            </div>
          )}

          <div className="side-panel-actions" role="toolbar" aria-label="Quick actions">
            {actions.map(a => (
              <button key={a.id} onClick={() => runAction(a.id)} disabled={loading} className={`side-panel-action ${activeAction === a.id ? 'active' : ''}`} aria-pressed={activeAction === a.id}>
                <span className="material-symbols-outlined icon-sm" aria-hidden="true">{a.icon}</span>
                <span className="text-[11px]">{a.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleAsk} className="side-panel-ask">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)} placeholder={isWebTab ? 'Ask about this topic…' : 'Ask about this page…'} className="side-panel-ask-input" disabled={loading} aria-label="Ask a question" />
            <button type="submit" disabled={loading || !question.trim()} className="side-panel-ask-btn" aria-label="Send">
              <span className="material-symbols-outlined icon-sm" aria-hidden="true">send</span>
            </button>
          </form>

          {(response || loading || error) ? (
            <div className="side-panel-response" ref={contentRef} aria-live="polite">
              {loading && !response && (
                <div className="space-y-2 py-2">
                  <div className="bw-shimmer h-3 w-full" />
                  <div className="bw-shimmer h-3 w-4/5" />
                  <div className="bw-shimmer h-3 w-3/5" />
                </div>
              )}
              {error && !response && (
                <div className="py-2" role="alert">
                  <p className="text-[12px] mb-2" style={{ color: 'var(--bw-red)' }}>{error}</p>
                  {activeAction && (
                    <button
                      onClick={() => runAction(activeAction, question.trim() || undefined)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{ background: 'var(--bw-accent)', color: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }} aria-hidden="true">refresh</span>
                      Try again
                    </button>
                  )}
                </div>
              )}
              <div className={`side-panel-text ${loading && response ? 'streaming-cursor' : ''}`}>{response}</div>
              {loading && response && (
                <button onClick={handleStop} className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium" style={{ color: 'var(--bw-text-quaternary)', border: '1px solid var(--bw-border)', transition: 'color 0.1s ease' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')} aria-label="Stop generating">
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
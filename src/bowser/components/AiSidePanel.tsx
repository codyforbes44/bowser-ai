import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TabKind } from '../types';
import { streamTextAnalysis, streamWebTabAnalysis, AnalysisAction } from '../services/geminiService';

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
  isOpen,
  onClose,
  pageHtml,
  tabKind,
  webTabUrl,
  webTabTitle,
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

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  useEffect(() => {
    if (loading && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [response, loading]);

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setResponse('');
    setError(null);
    setActiveAction(null);
    setQuestion('');
    setLoading(false);
  }, []);

  const runAction = useCallback(async (action: AnalysisAction, q?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveAction(action);
    setResponse('');
    setError(null);
    setLoading(true);

    try {
      let stream: AsyncGenerator<string>;

      if (isWebTab && webTabUrl) {
        stream = streamWebTabAnalysis(webTabUrl, webTabTitle || '', action, q, controller.signal);
      } else if (pageHtml) {
        stream = streamTextAnalysis(pageHtml, action, q, controller.signal);
      } else {
        setError('No content available to analyze.');
        setLoading(false);
        return;
      }

      let fullText = '';
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        fullText += chunk;
        setResponse(fullText);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [pageHtml, isWebTab, webTabUrl, webTabTitle]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      runAction('ask', question.trim());
    }
  };

  if (!isOpen) return null;

  const actions = isWebTab ? WEB_TAB_ACTIONS : AI_TAB_ACTIONS;
  const askPlaceholder = isWebTab
    ? 'Ask about this topic…'
    : 'Ask about this page…';

  return (
    <aside className="side-panel" role="complementary" aria-label="Page assistant">
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">auto_awesome</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.01em' }}>
            Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(response || activeAction) && (
            <button
              onClick={handleNewConversation}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--bw-text-quaternary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
              aria-label="New conversation"
              title="New conversation"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--bw-text-quaternary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
            aria-label="Close panel"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {isSystemTab ? (
        <EmptyState
          icon="web"
          title="Nothing to analyze"
          description="Navigate to a page first, then use the assistant."
        />
      ) : !canAnalyze ? (
        <EmptyState
          icon={isWebTab ? 'public' : 'web'}
          title={isWebTab ? 'No page loaded' : 'No content yet'}
          description={isWebTab
            ? 'Load a website to ask questions about it.'
            : 'Generate a page first, then use the assistant.'}
        />
      ) : (
        <>
          {/* Web tab disclaimer */}
          {isWebTab && !response && !loading && (
            <div className="px-3 py-2 mx-3 mt-2 rounded-md" style={{ background: 'var(--bw-accent-muted)', border: '1px solid var(--bw-border-subtle)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
                Bowser can discuss this topic based on general knowledge. It cannot read the live page content.
              </p>
            </div>
          )}

          {/* Action chips */}
          <div className="side-panel-actions" role="toolbar" aria-label="Quick actions">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => runAction(action.id)}
                disabled={loading}
                className={`side-panel-action ${activeAction === action.id ? 'active' : ''}`}
                aria-pressed={activeAction === action.id}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{action.icon}</span>
                <span className="text-[11px]">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Ask input */}
          <form onSubmit={handleAsk} className="side-panel-ask">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={askPlaceholder}
              className="side-panel-ask-input"
              disabled={loading}
              aria-label={askPlaceholder}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="side-panel-ask-btn"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">send</span>
            </button>
          </form>

          {/* Response area */}
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
                <div className="text-[13px] py-2" style={{ color: 'var(--bw-red)' }} role="alert">{error}</div>
              )}
              <div className={`side-panel-text ${loading && response ? 'streaming-cursor' : ''}`}>{response}</div>
              {loading && response && (
                <button
                  onClick={handleStop}
                  className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ color: 'var(--bw-text-quaternary)', border: '1px solid var(--bw-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                  aria-label="Stop generating"
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">stop</span>
                  Stop
                </button>
              )}
            </div>
          ) : (
            <div className="side-panel-hint">
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
                {isWebTab ? 'Ask about this website or choose an action above.' : 'Choose an action or ask a question about this page.'}
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

/** Shared empty state component */
const EmptyState: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="side-panel-empty" role="status">
    <span className="material-symbols-outlined text-2xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">{icon}</span>
    <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>{title}</p>
    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>{description}</p>
  </div>
);
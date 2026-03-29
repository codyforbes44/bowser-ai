import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TabKind } from '../types';
import { streamTextAnalysis, AnalysisAction } from '../services/geminiService';

interface AiSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageHtml: string | null;
  tabKind: TabKind;
}

const ACTIONS: { id: AnalysisAction; label: string; icon: string; description: string }[] = [
  { id: 'summarize', label: 'Summarize', icon: 'summarize', description: 'Get a concise overview' },
  { id: 'key-points', label: 'Key points', icon: 'list', description: 'Extract the main takeaways' },
  { id: 'simplify', label: 'Simplify', icon: 'edit_note', description: 'Rewrite in plain language' },
];

export const AiSidePanel: React.FC<AiSidePanelProps> = ({
  isOpen,
  onClose,
  pageHtml,
  tabKind,
}) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<AnalysisAction | null>(null);
  const [question, setQuestion] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const canAnalyze = tabKind === 'ai' && !!pageHtml;
  const isWebTab = tabKind === 'web';

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

  const runAction = useCallback(async (action: AnalysisAction, q?: string) => {
    if (!pageHtml) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveAction(action);
    setResponse('');
    setError(null);
    setLoading(true);

    try {
      const stream = streamTextAnalysis(pageHtml, action, q, controller.signal);
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
  }, [pageHtml]);

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

      {/* Body */}
      {isWebTab ? (
        <div className="side-panel-empty" role="status">
          <span className="material-symbols-outlined text-2xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">lock</span>
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>Can't read this page</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
            Browser security prevents reading external websites. Generate a page in AI mode to use the assistant.
          </p>
        </div>
      ) : !canAnalyze ? (
        <div className="side-panel-empty" role="status">
          <span className="material-symbols-outlined text-2xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">web</span>
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>Nothing to analyze yet</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
            Generate a page first, then use the assistant to summarize, simplify, or ask questions about it.
          </p>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="side-panel-actions" role="toolbar" aria-label="Quick actions">
            {ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => runAction(action.id)}
                disabled={loading}
                className={`side-panel-action ${activeAction === action.id ? 'active' : ''}`}
                aria-pressed={activeAction === action.id}
                title={action.description}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{action.icon}</span>
                <span className="text-[12px]">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Ask input */}
          <form onSubmit={handleAsk} className="side-panel-ask">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask about this page…"
              className="side-panel-ask-input"
              disabled={loading}
              aria-label="Ask a question about this page"
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
                <div className="flex items-center gap-2 py-2">
                  <div className="tab-spinner" aria-hidden="true" />
                  <span className="text-[12px]" style={{ color: 'var(--bw-text-quaternary)' }}>Working…</span>
                </div>
              )}
              {error && !response && (
                <div className="text-[13px] py-2" style={{ color: 'var(--bw-red)' }} role="alert">{error}</div>
              )}
              <div className="side-panel-text">{response}</div>
              {loading && response && (
                <button
                  onClick={handleStop}
                  className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ color: 'var(--bw-text-quaternary)', border: '1px solid var(--bw-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                  aria-label="Stop"
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">stop</span>
                  Stop
                </button>
              )}
            </div>
          ) : (
            <div className="side-panel-hint">
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
                Choose an action or ask a question about this page.
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

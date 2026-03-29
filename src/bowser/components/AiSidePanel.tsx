import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TabKind } from '../types';
import { streamTextAnalysis, AnalysisAction } from '../services/geminiService';

interface AiSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageHtml: string | null;
  tabKind: TabKind;
}

const ACTIONS: { id: AnalysisAction; label: string; icon: string }[] = [
  { id: 'summarize', label: 'Summarize', icon: 'summarize' },
  { id: 'key-points', label: 'Key points', icon: 'list' },
  { id: 'simplify', label: 'Simplify', icon: 'edit_note' },
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

  // Auto-scroll as content streams
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
        setError('Analysis could not be completed. Please try again.');
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
    <aside className="side-panel" role="complementary" aria-label="AI page analysis">
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-accent)' }} aria-hidden="true">auto_awesome</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.01em' }}>
            Page Analysis
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--bw-text-quaternary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
          aria-label="Close side panel"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
        </button>
      </div>

      {/* Body */}
      {isWebTab ? (
        <div className="side-panel-empty" role="status">
          <span className="material-symbols-outlined text-2xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">lock</span>
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>Content not accessible</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
            Web pages in iframes can't be read due to browser security. Switch to AI mode to analyze generated content.
          </p>
        </div>
      ) : !canAnalyze ? (
        <div className="side-panel-empty" role="status">
          <span className="material-symbols-outlined text-2xl mb-2" style={{ color: 'var(--bw-text-quaternary)', opacity: 0.6 }} aria-hidden="true">web</span>
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>No page to analyze</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
            Generate or navigate to an AI page first.
          </p>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="side-panel-actions" role="toolbar" aria-label="Analysis actions">
            {ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => runAction(action.id)}
                disabled={loading}
                className={`side-panel-action ${activeAction === action.id ? 'active' : ''}`}
                aria-pressed={activeAction === action.id}
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
              aria-label="Submit question"
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
                  <span className="text-[12px]" style={{ color: 'var(--bw-text-quaternary)' }}>Analyzing…</span>
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
                  aria-label="Stop analysis"
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">stop</span>
                  Stop
                </button>
              )}
            </div>
          ) : (
            <div className="side-panel-hint">
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--bw-text-quaternary)' }}>
                Choose an action above or ask a question about the current page.
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
};

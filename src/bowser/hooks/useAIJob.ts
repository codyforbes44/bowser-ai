import { useState, useRef, useCallback, useEffect } from 'react';
import { AIJobState, AIJobStatus } from '../types';
import { AnalysisAction, streamTextAnalysis, streamWebTabAnalysis } from '../services/geminiService';

interface UseAIJobOptions {
  pageHtml: string | null;
  isWebTab: boolean;
  webTabUrl?: string;
  webTabTitle?: string;
}

interface UseAIJobReturn {
  state: AIJobState;
  activeAction: AnalysisAction | null;
  start: (action: AnalysisAction, question?: string) => void;
  abort: () => void;
  reset: () => void;
  retry: () => void;
}

const INITIAL_STATE: AIJobState = { status: 'idle', content: '', error: null };

export function useAIJob(opts: UseAIJobOptions): UseAIJobReturn {
  const { pageHtml, isWebTab, webTabUrl, webTabTitle } = opts;
  const [state, setState] = useState<AIJobState>(INITIAL_STATE);
  const [activeAction, setActiveAction] = useState<AnalysisAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastArgsRef = useRef<{ action: AnalysisAction; question?: string } | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const start = useCallback((action: AnalysisAction, question?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastArgsRef.current = { action, question };
    setActiveAction(action);
    setState({ status: 'loading', content: '', error: null });

    (async () => {
      try {
        const stream = (isWebTab && webTabUrl)
          ? streamWebTabAnalysis(webTabUrl, webTabTitle || '', action, question, controller.signal)
          : pageHtml
            ? streamTextAnalysis(pageHtml, action, question, controller.signal)
            : null;

        if (!stream) {
          setState({ status: 'error', content: '', error: 'No content available.' });
          return;
        }

        let fullText = '';
        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          fullText += chunk;
          setState({ status: 'streaming', content: fullText, error: null });
        }

        if (!controller.signal.aborted) {
          setState({ status: 'done', content: fullText, error: null });
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError' && !controller.signal.aborted) {
          setState({ status: 'error', content: '', error: 'Something went wrong. Please try again.' });
        }
      }
    })();
  }, [pageHtml, isWebTab, webTabUrl, webTabTitle]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'done' }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
    setActiveAction(null);
    lastArgsRef.current = null;
  }, []);

  const retry = useCallback(() => {
    if (lastArgsRef.current) {
      start(lastArgsRef.current.action, lastArgsRef.current.question);
    }
  }, [start]);

  return { state, activeAction, start, abort, reset, retry };
}

import { useCallback, useRef } from 'react';
import { Tab, AgentTask, AgentStep } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useAgentExecute(deps: {
  updateTabById: (id: string, updater: (t: Tab) => Tab) => void;
}) {
  const { updateTabById } = deps;
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const executeAgent = useCallback(async (goal: string, tabId: string) => {
    const existing = abortControllersRef.current.get(tabId);
    if (existing) existing.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    const task: AgentTask = {
      goal,
      steps: [],
      status: 'planning',
      finalHtml: '',
    };

    updateTabById(tabId, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Agent is planning…',
      generatedContent: '',
    }));

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/agent-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ goal, maxSteps: 6 }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error('Agent execution failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const data = JSON.parse(jsonStr);

            if (data.step === 'html') {
              task.finalHtml = data.output;
              task.status = 'complete';
              updateTabById(tabId, tab => ({
                ...tab,
                generatedContent: data.output,
                loading: false,
                loadingMessage: '',
              }));
            } else {
              const step: AgentStep = {
                id: crypto.randomUUID(),
                tool: data.tool || data.step,
                input: data.input || '',
                output: data.output || '',
                status: data.status === 'complete' ? 'done' : data.status === 'error' ? 'error' : data.status === 'running' ? 'running' : 'done',
                timestamp: Date.now(),
              };
              task.steps.push(step);

              if (data.status === 'error') task.status = 'error';
              else if (data.step === 'act') task.status = 'executing';

              updateTabById(tabId, tab => ({
                ...tab,
                loadingMessage: `Agent: ${data.output?.slice(0, 50) || data.step}…`,
              }));
            }
          } catch {
            // Incomplete JSON
          }
        }
      }

      // Store the task on the tab for the AgentView
      updateTabById(tabId, tab => ({
        ...tab,
        loading: false,
        loadingMessage: '',
      }));

    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Agent failed', e);
      updateTabById(tabId, tab => ({
        ...tab,
        loading: false,
        loadingMessage: '',
        generatedContent: `<html><head><title>Agent Error</title><meta name="color-scheme" content="dark"></head><body style="font-family: system-ui; padding: 40px; background: #111; color: #e8eaed;"><h1 style="font-size: 18px;">Agent task failed</h1><p style="color: #999;">Something went wrong. Try a simpler goal or try again.</p></body></html>`,
      }));
    } finally {
      if (abortControllersRef.current.get(tabId) === controller) {
        abortControllersRef.current.delete(tabId);
      }
    }

    return task;
  }, [updateTabById]);

  const cancelAgent = useCallback((tabId: string) => {
    const controller = abortControllersRef.current.get(tabId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(tabId);
    }
    updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
  }, [updateTabById]);

  return { executeAgent, cancelAgent };
}

import { useCallback, useRef } from 'react';
import { Tab, AgentTask, AgentStep, PinnedInsight } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Trigger haptic feedback if supported */
function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if ('vibrate' in navigator) {
      const ms = style === 'heavy' ? 50 : style === 'medium' ? 30 : 15;
      navigator.vibrate(ms);
    }
  } catch { /* no-op */ }
}

/** Extract likely domains from a goal string for preconnect hints */
function extractPreconnectDomains(goal: string): string[] {
  const urlRegex = /https?:\/\/[^\s/$.?#][^\s]*/gi;
  const matches = goal.match(urlRegex) || [];
  const domains: string[] = [];
  for (const url of matches) {
    try { domains.push(new URL(url).origin); } catch { /* skip */ }
  }
  return [...new Set(domains)];
}

/** Inject preconnect link hints into document head */
function injectPreconnectHints(domains: string[]) {
  for (const origin of domains) {
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    const dns = document.createElement('link');
    dns.rel = 'dns-prefetch';
    dns.href = origin;
    document.head.appendChild(dns);
  }
}

/** High-stakes actions that require user confirmation */
const HIGH_STAKES_TOOLS = new Set(['browse_url', 'extract_data', 'analyze_image']);

export function useAgentExecute(deps: {
  updateTabById: (id: string, updater: (t: Tab) => Tab) => void;
}) {
  const { updateTabById } = deps;
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const confirmResolvers = useRef<Map<string, (confirmed: boolean) => void>>(new Map());

  const confirmStep = useCallback((tabId: string, confirmed: boolean) => {
    const resolver = confirmResolvers.current.get(tabId);
    if (resolver) {
      resolver(confirmed);
      confirmResolvers.current.delete(tabId);
    }
  }, []);

  const pinInsight = useCallback((tabId: string, text: string, source: string) => {
    const insight: PinnedInsight = {
      id: crypto.randomUUID(),
      text,
      source,
      timestamp: Date.now(),
    };
    updateTabById(tabId, tab => {
      const task = tab.agentTask;
      if (!task) return tab;
      return {
        ...tab,
        agentTask: {
          ...task,
          pinnedInsights: [...(task.pinnedInsights || []), insight],
        },
      };
    });
    haptic('light');
  }, [updateTabById]);

  const unpinInsight = useCallback((tabId: string, insightId: string) => {
    updateTabById(tabId, tab => {
      const task = tab.agentTask;
      if (!task) return tab;
      return {
        ...tab,
        agentTask: {
          ...task,
          pinnedInsights: (task.pinnedInsights || []).filter(i => i.id !== insightId),
        },
      };
    });
  }, [updateTabById]);

  const executeAgent = useCallback(async (goal: string, tabId: string) => {
    const existing = abortControllersRef.current.get(tabId);
    if (existing) existing.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    // Predictive preconnect for domains in the goal
    const preconnectDomains = extractPreconnectDomains(goal);
    injectPreconnectHints(preconnectDomains);

    const task: AgentTask = {
      goal,
      steps: [],
      status: 'planning',
      finalHtml: '',
      pinnedInsights: [],
      preconnectDomains,
    };

    haptic('medium');

    updateTabById(tabId, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Agent is planning…',
      generatedContent: '',
      agentTask: task,
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
              haptic('heavy');
              updateTabById(tabId, tab => ({
                ...tab,
                generatedContent: data.output,
                loading: false,
                loadingMessage: '',
                agentTask: { ...task },
              }));
            } else {
              const step: AgentStep = {
                id: crypto.randomUUID(),
                tool: data.tool || data.step,
                input: data.input || '',
                output: data.output || '',
                status: data.status === 'complete' ? 'done' : data.status === 'error' ? 'error' : data.status === 'running' ? 'running' : 'done',
                timestamp: Date.now(),
                action: data.action,
              };

              // Check for high-stakes confirmation
              if (HIGH_STAKES_TOOLS.has(step.tool) && data.requiresConfirmation) {
                step.status = 'awaiting_confirmation';
                task.status = 'awaiting_confirmation';
                task.steps.push(step);
                haptic('heavy');

                updateTabById(tabId, tab => ({
                  ...tab,
                  loadingMessage: `Awaiting confirmation: ${step.tool}`,
                  agentTask: { ...task },
                }));

                // Wait for user confirmation
                const confirmed = await new Promise<boolean>((resolve) => {
                  confirmResolvers.current.set(tabId, resolve);
                });

                if (!confirmed) {
                  step.status = 'error';
                  step.output = 'User declined this action';
                  task.status = 'error';
                  updateTabById(tabId, tab => ({
                    ...tab,
                    loading: false,
                    loadingMessage: '',
                    agentTask: { ...task },
                  }));
                  return task;
                }

                step.status = 'running';
                task.status = 'executing';
              } else {
                task.steps.push(step);
              }

              if (data.status === 'error') task.status = 'error';
              else if (data.step === 'act') task.status = 'executing';

              haptic('light');

              updateTabById(tabId, tab => ({
                ...tab,
                loadingMessage: `Agent: ${data.output?.slice(0, 50) || data.step}…`,
                agentTask: { ...task },
              }));
            }
          } catch {
            // Incomplete JSON
          }
        }
      }

      updateTabById(tabId, tab => ({
        ...tab,
        loading: false,
        loadingMessage: '',
        agentTask: { ...task },
      }));

    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Agent failed', e);
      haptic('heavy');
      updateTabById(tabId, tab => ({
        ...tab,
        loading: false,
        loadingMessage: '',
        generatedContent: `<html><head><title>Agent Error</title><meta name="color-scheme" content="dark"></head><body style="font-family: system-ui; padding: 40px; background: #111; color: #e8eaed;"><h1 style="font-size: 18px;">Agent task failed</h1><p style="color: #999;">Something went wrong. Try a simpler goal or try again.</p></body></html>`,
        agentTask: { ...task, status: 'error' },
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

  return { executeAgent, cancelAgent, confirmStep, pinInsight, unpinInsight };
}

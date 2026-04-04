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

  const AGENT_PREFIX = 'Build it Bowser:';

  const executeAgent = useCallback(async (goal: string, tabId: string) => {
    // Strict command validation: must start with "Build it Bowser:"
    if (!goal.startsWith(AGENT_PREFIX)) {
      const rejectionHtml = `<html><head><meta name="color-scheme" content="dark"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e8eaed;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{max-width:480px;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center;backdrop-filter:blur(20px)}.icon{font-size:48px;margin-bottom:16px;opacity:0.7}h1{font-size:18px;font-weight:600;margin-bottom:12px;color:#fff}p{font-size:14px;line-height:1.6;color:#9aa0a6;margin-bottom:20px}code{background:rgba(138,180,248,0.12);color:#8ab4f8;padding:4px 10px;border-radius:8px;font-size:13px;font-family:'SF Mono',monospace;display:inline-block;margin-top:4px}</style></head><body><div class="card"><div class="icon">🐢</div><h1>Command Prefix Required</h1><p>To trigger an autonomous build, please start your message with:</p><code>Build it Bowser: your goal here</code></div></body></html>`;
      updateTabById(tabId, tab => ({
        ...tab,
        tabKind: 'agent',
        loading: false,
        loadingMessage: '',
        generatedContent: rejectionHtml,
        agentTask: {
          goal,
          steps: [],
          status: 'error',
          finalHtml: rejectionHtml,
          pinnedInsights: [],
          preconnectDomains: [],
        },
      }));
      return;
    }

    // Strip the prefix for the actual goal
    const cleanGoal = goal.slice(AGENT_PREFIX.length).trim();
    if (!cleanGoal) {
      const emptyHtml = `<html><head><meta name="color-scheme" content="dark"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e8eaed;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{max-width:480px;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center}h1{font-size:18px;margin-bottom:12px}p{font-size:14px;color:#9aa0a6}</style></head><body><div class="card"><div style="font-size:48px;margin-bottom:16px">🐢</div><h1>Empty Goal</h1><p>Please provide a goal after "Build it Bowser:"</p></div></body></html>`;
      updateTabById(tabId, tab => ({
        ...tab,
        tabKind: 'agent',
        loading: false,
        generatedContent: emptyHtml,
        agentTask: { goal, steps: [], status: 'error', finalHtml: emptyHtml, pinnedInsights: [], preconnectDomains: [] },
      }));
      return;
    }

    const existing = abortControllersRef.current.get(tabId);
    if (existing) existing.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    // Predictive preconnect for domains in the goal
    const preconnectDomains = extractPreconnectDomains(cleanGoal);
    injectPreconnectHints(preconnectDomains);

    const task: AgentTask = {
      goal: cleanGoal,
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
        body: JSON.stringify({ goal: cleanGoal, maxSteps: 6 }),
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

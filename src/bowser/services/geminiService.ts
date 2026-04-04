import { TokenCount } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type AnalysisAction = 'summarize' | 'key-points' | 'simplify' | 'ask' | 'related' | 'explain';

// ── SSE parsing helper ──────────────────────────────────────────────
async function* parseSSEStream(
  response: Response,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (abortSignal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) yield content;
        } catch {
          // partial JSON, put back
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) yield content;
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Page Generation ─────────────────────────────────────────────────
export async function* streamPageGeneration(
  prompt: string,
  currentPageHtml: string | null = null,
  abortSignal?: AbortSignal,
  formState?: Array<{ name: string; type: string; value: string }>,
  isMobile: boolean = false,
  conversationHistory?: Array<{ prompt: string; summary: string }>,
): AsyncGenerator<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ prompt, currentPageHtml, formState, isMobile, conversationHistory }),
    signal: abortSignal,
  });

  if (!response.ok) {
    let errMsg = 'Generation failed';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch { /* ignore */ }
    yield `<div class="p-8 text-red-600"><h1>Generation Error</h1><p>${errMsg}</p></div>`;
    return;
  }

  let totalChars = 0;
  for await (const chunk of parseSSEStream(response, abortSignal)) {
    totalChars += chunk.length;
    // Emit estimated token count
    const estimated = Math.round(totalChars / 4);
    yield `__TOKEN__${JSON.stringify({ input: 0, output: estimated, isEstimate: true })}`;
    yield chunk;
  }

  // Final meta with approximate counts
  const finalOutput = Math.round(totalChars / 4);
  yield `__META__${JSON.stringify({ tokenCount: { input: 0, output: finalOutput } })}`;
}

// ── Page Rebuild from URL ───────────────────────────────────────────
export async function* streamPageRebuild(
  url: string,
  abortSignal?: AbortSignal,
  isMobile: boolean = false,
): AsyncGenerator<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rebuild-from-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ url, isMobile }),
    signal: abortSignal,
  });

  if (!response.ok) {
    let errMsg = 'Rebuild failed';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch { /* ignore */ }
    yield `<div class="p-8 text-red-600"><h1>Rebuild Error</h1><p>${errMsg}</p></div>`;
    return;
  }

  let totalChars = 0;
  for await (const chunk of parseSSEStream(response, abortSignal)) {
    totalChars += chunk.length;
    const estimated = Math.round(totalChars / 4);
    yield `__TOKEN__${JSON.stringify({ input: 0, output: estimated, isEstimate: true })}`;
    yield chunk;
  }

  const finalOutput = Math.round(totalChars / 4);
  yield `__META__${JSON.stringify({ tokenCount: { input: 0, output: finalOutput } })}`;
}

// ── Text Analysis (AI tabs) ─────────────────────────────────────────
export async function* streamTextAnalysis(
  pageHtml: string,
  action: AnalysisAction,
  question?: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ action, question, pageHtml }),
      signal: abortSignal,
    });

    if (!response.ok) {
      yield 'Analysis failed: server error';
      return;
    }

    for await (const chunk of parseSSEStream(response, abortSignal)) {
      yield chunk;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    yield `Analysis failed: ${error?.message || 'Unknown error'}`;
  }
}

// ── Text Analysis (Web tabs) ────────────────────────────────────────
export async function* streamWebTabAnalysis(
  url: string,
  tabTitle: string,
  action: AnalysisAction,
  question?: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ action, question, url, title: tabTitle }),
      signal: abortSignal,
    });

    if (!response.ok) {
      yield 'Analysis failed: server error';
      return;
    }

    for await (const chunk of parseSSEStream(response, abortSignal)) {
      yield chunk;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    yield `Analysis failed: ${error?.message || 'Unknown error'}`;
  }
}

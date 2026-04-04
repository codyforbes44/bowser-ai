import { useCallback, useRef } from 'react';
import { Page, Breadcrumb, TokenCount, FormFieldState, Tab } from '../types';
import { streamPageGeneration, streamPageRebuild } from '../services/geminiService';
import { extractTitleFromHtml, siteNameFromPrompt } from '../utils/urlHelpers';
import { addRecentPrompt } from '../store/session';

interface ConversationEntry {
  prompt: string;
  summary: string;
}

// Per-tab conversation context (rolling window of last 5 interactions)
const tabConversationContext = new Map<string, ConversationEntry[]>();

function addConversationEntry(tabId: string, prompt: string, html: string) {
  const entries = tabConversationContext.get(tabId) || [];
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const summary = titleMatch ? titleMatch[1] : prompt.slice(0, 100);
  entries.push({ prompt, summary });
  // Keep only last 5
  if (entries.length > 5) entries.splice(0, entries.length - 5);
  tabConversationContext.set(tabId, entries);
}

function getConversationContext(tabId: string): ConversationEntry[] {
  return tabConversationContext.get(tabId) || [];
}

export function useAIGenerate(deps: {
  activeTab: Tab | undefined;
  updateTabById: (id: string, updater: (t: Tab) => Tab) => void;
}) {
  const { activeTab, updateTabById } = deps;
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const generate = useCallback(async (
    prompt: string,
    currentHtml: string | null,
    fallbackBreadcrumb: Breadcrumb,
    pushHistory: boolean = true,
    formState?: FormFieldState[],
    targetTabId?: string,
  ) => {
    const tabId = targetTabId || activeTab?.id;
    if (!tabId) return;

    const existingController = abortControllersRef.current.get(tabId);
    if (existingController) existingController.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    updateTabById(tabId, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Generating page…',
      generatedContent: '',
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
      breadcrumb: { sitename: fallbackBreadcrumb.sitename, page: '' },
      ...(pushHistory ? { navigationId: tab.navigationId + 1 } : {}),
    }));

    let fullHtml = '';
    let pageTokenCount: TokenCount = { input: 0, output: 0 };
    let titleExtracted = false;

    try {
      const conversationHistory = getConversationContext(tabId);
      const stream = streamPageGeneration(prompt, currentHtml, controller.signal, formState, window.innerWidth <= 768, conversationHistory);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;

        if (chunk.startsWith('__TOKEN__')) {
          try {
            const tokenData = JSON.parse(chunk.replace('__TOKEN__', ''));
            updateTabById(tabId, tab => ({ ...tab, tokenCount: tokenData }));
          } catch { /* ignore */ }
          continue;
        }

        if (chunk.startsWith('__META__')) {
          try {
            const meta = JSON.parse(chunk.replace('__META__', ''));
            pageTokenCount = meta.tokenCount;
            updateTabById(tabId, tab => ({ ...tab, tokenCount: pageTokenCount }));
          } catch { /* ignore */ }
          continue;
        }
        fullHtml += chunk;

        const currentFullHtml = fullHtml;
        let extractedBreadcrumb: Breadcrumb | null = null;
        if (!titleExtracted && currentFullHtml.includes('</title>')) {
          extractedBreadcrumb = extractTitleFromHtml(currentFullHtml);
          if (extractedBreadcrumb) titleExtracted = true;
        }

        updateTabById(tabId, tab => ({
          ...tab,
          generatedContent: currentFullHtml,
          ...(extractedBreadcrumb ? { breadcrumb: extractedBreadcrumb } : {}),
        }));
      }

      if (controller.signal.aborted) return;

      const finalBreadcrumb = titleExtracted
        ? (extractTitleFromHtml(fullHtml) || fallbackBreadcrumb)
        : fallbackBreadcrumb;

      const newPage: Page = {
        html: fullHtml,
        breadcrumb: finalBreadcrumb,
        scrollPosition: 0,
        timestamp: Date.now(),
        tokenCount: pageTokenCount,
        prompt,
        contextHtml: currentHtml,
        isGrounded: false,
        groundingSources: [],
        searchEntryPointHtml: '',
      };

      updateTabById(tabId, tab => {
        if (pushHistory) {
          const newHistory = [...tab.history.slice(0, tab.currentIndex + 1), newPage];
          return { ...tab, history: newHistory, currentIndex: newHistory.length - 1, breadcrumb: finalBreadcrumb, tokenCount: pageTokenCount };
        } else {
          const updated = [...tab.history];
          if (tab.currentIndex >= 0) updated[tab.currentIndex] = newPage;
          return { ...tab, history: updated, breadcrumb: finalBreadcrumb, tokenCount: pageTokenCount };
        }
      });

      // Track conversation context for this tab
      addConversationEntry(tabId, prompt, fullHtml);

    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
      updateTabById(tabId, tab => ({
        ...tab,
        breadcrumb: fallbackBreadcrumb,
        generatedContent: `<html><head><title>Page unavailable</title><meta name="color-scheme" content="dark"></head><body style="font-family: system-ui, sans-serif; padding: 40px; background: #111; color: #e8eaed;"><h1 style="font-size: 18px; margin-bottom: 8px;">This page couldn't be generated</h1><p style="color: #999; font-size: 14px;">Something went wrong while building this page. Try again or describe something different.</p></body></html>`,
      }));
    } finally {
      if (abortControllersRef.current.get(tabId) === controller) {
        updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
        abortControllersRef.current.delete(tabId);
      }
    }
  }, [activeTab?.id, updateTabById]);

  const handleStop = useCallback(() => {
    if (!activeTab) return;
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) { controller.abort(); abortControllersRef.current.delete(tabId); }
    updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
  }, [activeTab, updateTabById]);

  const handleCreate = useCallback((prompt: string) => {
    addRecentPrompt(prompt);
    const fallback: Breadcrumb = { sitename: siteNameFromPrompt(prompt), page: 'Home' };
    generate(prompt, null, fallback, true);
  }, [generate]);

  const rebuild = useCallback(async (url: string, targetTabId?: string) => {
    const tabId = targetTabId || activeTab?.id;
    if (!tabId) return;

    const existingController = abortControllersRef.current.get(tabId);
    if (existingController) existingController.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    // Extract domain for breadcrumb
    let sitename = url;
    try {
      const parsed = new URL(url);
      sitename = parsed.hostname.replace(/^www\./, '').split('.')[0];
      sitename = sitename.charAt(0).toUpperCase() + sitename.slice(1);
    } catch { /* use url as-is */ }

    const fallbackBreadcrumb: Breadcrumb = { sitename, page: 'Rebuild' };

    updateTabById(tabId, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Fetching & rebuilding page…',
      generatedContent: '',
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
      breadcrumb: fallbackBreadcrumb,
      navigationId: tab.navigationId + 1,
    }));

    let fullHtml = '';
    let pageTokenCount: TokenCount = { input: 0, output: 0 };
    let titleExtracted = false;

    try {
      const stream = streamPageRebuild(url, controller.signal, window.innerWidth <= 768);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;

        if (chunk.startsWith('__TOKEN__')) {
          try {
            const tokenData = JSON.parse(chunk.replace('__TOKEN__', ''));
            updateTabById(tabId, tab => ({ ...tab, tokenCount: tokenData }));
          } catch { /* ignore */ }
          continue;
        }

        if (chunk.startsWith('__META__')) {
          try {
            const meta = JSON.parse(chunk.replace('__META__', ''));
            pageTokenCount = meta.tokenCount;
            updateTabById(tabId, tab => ({ ...tab, tokenCount: pageTokenCount }));
          } catch { /* ignore */ }
          continue;
        }

        fullHtml += chunk;
        const currentFullHtml = fullHtml;
        let extractedBreadcrumb: Breadcrumb | null = null;
        if (!titleExtracted && currentFullHtml.includes('</title>')) {
          extractedBreadcrumb = extractTitleFromHtml(currentFullHtml);
          if (extractedBreadcrumb) titleExtracted = true;
        }

        updateTabById(tabId, tab => ({
          ...tab,
          generatedContent: currentFullHtml,
          ...(extractedBreadcrumb ? { breadcrumb: extractedBreadcrumb } : {}),
        }));
      }

      if (controller.signal.aborted) return;

      const finalBreadcrumb = titleExtracted
        ? (extractTitleFromHtml(fullHtml) || fallbackBreadcrumb)
        : fallbackBreadcrumb;

      const newPage: Page = {
        html: fullHtml,
        breadcrumb: finalBreadcrumb,
        scrollPosition: 0,
        timestamp: Date.now(),
        tokenCount: pageTokenCount,
        prompt: `Rebuild: ${url}`,
        contextHtml: null,
        isGrounded: false,
        groundingSources: [],
        searchEntryPointHtml: '',
      };

      updateTabById(tabId, tab => {
        const newHistory = [...tab.history.slice(0, tab.currentIndex + 1), newPage];
        return { ...tab, history: newHistory, currentIndex: newHistory.length - 1, breadcrumb: finalBreadcrumb, tokenCount: pageTokenCount };
      });

    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Rebuild failed', e);
      updateTabById(tabId, tab => ({
        ...tab,
        breadcrumb: fallbackBreadcrumb,
        generatedContent: `<html><head><title>Rebuild failed</title><meta name="color-scheme" content="dark"></head><body style="font-family: system-ui, sans-serif; padding: 40px; background: #111; color: #e8eaed;"><h1 style="font-size: 18px; margin-bottom: 8px;">This page couldn't be rebuilt</h1><p style="color: #999; font-size: 14px;">Something went wrong while rebuilding this page. Try again or use a different URL.</p></body></html>`,
      }));
    } finally {
      if (abortControllersRef.current.get(tabId) === controller) {
        updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
        abortControllersRef.current.delete(tabId);
      }
    }
  }, [activeTab?.id, updateTabById]);

  return { generate, rebuild, handleStop, handleCreate, abortControllersRef };
}

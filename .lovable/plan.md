

# Clarification: Bot Detection Scope

## Current State
The bot-detection logic (both the modernized headers and the server-side challenge detection) lives in the `proxy-web` edge function, which is **only used by Web mode** (`WebProxy.tsx`). The agentic/Create flows use entirely separate edge functions (`agent-execute`, `generate-page`, `rebuild-from-url`).

This means the bot detection is actually **backwards** from what you want — it's applied to Web browsing (where it shouldn't interfere) but doesn't exist in the agent/Create paths.

## What Should Change

### 1. `proxy-web` edge function — Remove bot detection entirely
The proxy serves **Web mode only** — a standard browsing experience. Remove lines 136-151 (the bot-phrase scanning and `blocked` response). The modernized Chrome 124 headers (lines 108-122) are fine to keep since they help pages load, but the proxy should **never** second-guess the response — just pass the HTML through as-is, like a real browser would.

### 2. `WebProxy.tsx` — Remove `data.blocked` handling
Remove the `blocked` check (lines 43-48) since the proxy will no longer return that flag. The existing error UI for network failures / non-HTML responses stays.

### 3. Agent/Create edge functions — Add bot detection there if needed
If bot-challenge detection is desired for the **agent** or **rebuild** flows (where fetched content feeds into AI processing), add it to `agent-execute` or `rebuild-from-url` instead. This way only the AI pipeline rejects bot-challenged pages — Web mode simply renders whatever the site returns.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/proxy-web/index.ts` | Remove bot-detection block (lines 136-151) |
| `src/bowser/components/WebProxy.tsx` | Remove `data.blocked` check (lines 43-48) |

Two small deletions. Web browsing becomes a clean pass-through again.


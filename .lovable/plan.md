

# Add "Rebuild from URL" Feature

## What this does
Adds the ability to paste a URL into Bowser and have AI fetch, analyze, and rebuild the page as a best-in-class AI-generated version. This combines the existing **proxy-web** scraping with the **generate-page** AI generation into a new flow.

## How it works for the user
1. User pastes a URL in the omnibox while in **Create** mode (not Web mode)
2. Bowser detects it's a URL in Create mode and triggers the "rebuild" flow
3. The proxy fetches the source HTML, then the AI analyzes it and generates an improved version
4. The rebuilt page streams in like any other AI-generated page

## Technical approach

### 1. New Edge Function: `rebuild-from-url`
**File:** `supabase/functions/rebuild-from-url/index.ts`

- Accepts `{ url: string, isMobile: boolean }`
- Step 1: Fetches the source page HTML using the same logic as `proxy-web` (fetch with browser-like headers)
- Step 2: Strips scripts/styles, extracts meaningful content (text, structure, images, navigation)
- Step 3: Sends the extracted content + a specialized system prompt to the AI gateway for streaming rebuild
- System prompt instructs the AI to analyze the source content and recreate it as a polished, best-in-class implementation with improved design, accessibility, and UX
- Returns SSE stream (same format as `generate-page`)
- Handles 429/402 rate limit errors

### 2. Update Navigation Logic
**File:** `src/bowser/utils/navigation.ts`

- In `parseOmniboxInput`: when `currentKind === 'ai'` and input looks like a URL, return a new decision: `{ kind: 'ai', url: trimmed, query: trimmed, rebuild: true }`
- Add `rebuild?: boolean` to `NavigationDecision` interface

### 3. Update Omnibox Hook
**File:** `src/bowser/hooks/useOmnibox.ts`

- When `decision.rebuild === true`, call a new `rebuild` function instead of `generate`

### 4. Add Rebuild Streaming Service
**File:** `src/bowser/services/geminiService.ts`

- Add `streamPageRebuild(url, abortSignal, isMobile)` function
- Calls the new `rebuild-from-url` edge function
- Returns same `AsyncGenerator<string>` format as `streamPageGeneration`

### 5. Add Rebuild to AI Generate Hook
**File:** `src/bowser/hooks/useAIGenerate.ts`

- Add `rebuild(url, targetTabId?)` method that calls `streamPageRebuild` and manages tab state (loading, streaming, history) identically to `generate`

### 6. Wire into BowserApp
**File:** `src/bowser/BowserApp.tsx`

- Pass `rebuild` from `useAIGenerate` into `useOmnibox` deps
- No other changes needed; the tab rendering is already handled

## Edge Function System Prompt (key part)
The rebuild prompt will instruct the AI to:
- Analyze the source page's purpose, content, and structure
- Recreate it as a modern, polished implementation
- Use Tailwind CSS, Google Fonts, Material Symbols icons
- Improve layout, typography, color scheme, and accessibility
- Preserve all meaningful content and navigation structure
- Make it feel like a premium redesign of the original

## Files to create/modify
| File | Change |
|---|---|
| `supabase/functions/rebuild-from-url/index.ts` | **New** — fetch source + AI rebuild |
| `src/bowser/utils/navigation.ts` | Add `rebuild` flag to NavigationDecision |
| `src/bowser/services/geminiService.ts` | Add `streamPageRebuild` function |
| `src/bowser/hooks/useAIGenerate.ts` | Add `rebuild` method |
| `src/bowser/hooks/useOmnibox.ts` | Route URL-in-Create-mode to rebuild |
| `src/bowser/BowserApp.tsx` | Pass rebuild into useOmnibox |


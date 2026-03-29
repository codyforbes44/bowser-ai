

# Move AI Calls to Backend (Lovable AI Gateway)

## Problem
All Gemini API calls happen directly from the browser using `VITE_GEMINI_API_KEY`. This key is exposed in client-side code and likely has domain restrictions that block it on the published URL (`bowser-ai.lovable.app`).

## Solution
Move all AI calls to Supabase Edge Functions that use the Lovable AI Gateway (`LOVABLE_API_KEY`, already available). The client will stream responses from the edge functions instead of calling Google directly.

## Important Tradeoff: Google Search Grounding
The current "Live data" toggle uses Google's `googleSearch` grounding tool — a Google-specific feature not available through the Lovable AI Gateway. Two options:

- **Option A**: Drop the grounding feature (simplest). The "Live data" toggle would be removed or become a no-op.
- **Option B**: Keep grounding by making a separate Google Search API call before generation, injecting results into the prompt as context. This requires a Google Custom Search API key (different from Gemini) and more complexity.

**Recommendation**: Go with Option A for now — remove grounding. The generated pages are already rich without it, and this unblocks the published app immediately.

## Edge Functions to Create

### 1. `supabase/functions/generate-page/index.ts`
- Accepts: `prompt`, `currentPageHtml`, `formState`, `isMobile`
- Streams HTML generation via Lovable AI Gateway using the same system prompt
- Returns SSE stream with HTML chunks and a final `__META__` event for token counts
- Model: `google/gemini-3-flash-preview`

### 2. `supabase/functions/analyze-content/index.ts`
- Accepts: `action`, `question`, `pageHtml` (for AI tabs) or `url`/`title` (for web tabs)
- Streams text analysis responses
- Handles all `AnalysisAction` types (summarize, key-points, simplify, ask, related, explain)

## Client-Side Changes

### `src/bowser/services/geminiService.ts`
- Remove `@google/genai` SDK usage entirely
- Replace `streamPageGeneration` with a function that calls the `generate-page` edge function and parses the SSE stream
- Replace `streamTextAnalysis` and `streamWebTabAnalysis` with functions calling the `analyze-content` edge function
- Remove `countTokens` call (token counts will come from the gateway's `usage` field in the SSE stream)

### `src/bowser/BowserApp.tsx` / `src/bowser/components/AddressBar.tsx`
- Remove the "Live data" / grounding toggle UI and state (or keep it as cosmetic — pending your preference)
- Remove `isGrounded` prop threading

### `src/bowser/types.ts`
- Keep `GroundingSource` and `searchEntryPointHtml` types for backward compatibility with existing history entries, but new pages won't populate them

## File Changes Summary

| File | Change |
|---|---|
| `supabase/functions/generate-page/index.ts` | **New** — streaming page generation edge function |
| `supabase/functions/analyze-content/index.ts` | **New** — streaming analysis edge function |
| `src/bowser/services/geminiService.ts` | Rewrite to call edge functions instead of Google SDK |
| `src/bowser/BowserApp.tsx` | Remove grounding toggle state and props |
| `src/bowser/components/AddressBar.tsx` | Remove grounding/globe UI |
| `src/bowser/hooks/useAIGenerate.ts` | Remove `isGrounded` dependency |
| `src/bowser/components/AiSidePanel.tsx` | No structural changes (still calls geminiService) |
| `package.json` | Remove `@google/genai` dependency |

## Technical Notes
- Edge functions use `LOVABLE_API_KEY` (auto-provisioned, already available)
- SSE parsing on client uses the standard `data: ` line-by-line pattern from the Lovable AI docs
- The system prompt and all generation logic stays identical — only the transport layer changes
- `VITE_GEMINI_API_KEY` can be removed from secrets after migration


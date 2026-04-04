

# Fix: Remove Overly Aggressive Bot Detection

## Problem
The bot-phrase detection added to `WebProxy.tsx` (lines 43-65) is causing **false positives**. Generic phrases like `"please verify"`, `"just a moment"`, `"captcha"`, and `"access denied"` appear in legitimate website content (security pages, login forms, accessibility text, etc.), causing working sites to be incorrectly flagged as blocked.

The proxy itself works — the network log confirms 3bi.io returned full HTML with a 200 status. The navigation and header changes were correct. Only the bot detection is the regression.

## Fix

### File: `src/bowser/components/WebProxy.tsx`

**Remove the client-side bot-phrase detection entirely** (lines 43-65). Instead, move lightweight detection to the **server side** in the proxy edge function, where we can combine multiple signals:

### File: `supabase/functions/proxy-web/index.ts`

Add server-side bot detection after fetching the HTML, using **stricter criteria** — only flag a page as bot-blocked when:
1. The page is very short (under ~3KB of text content), AND
2. It contains 2+ bot-specific phrases (not generic ones)

This avoids false positives on real sites that happen to mention "verify" or "access denied" in their content.

Specifically:
- Strip HTML tags to get text length
- Only check truly bot-specific phrases: `"challenge-platform"`, `"cf-browser-verification"`, `"checking your browser"`, `"automated process"`, `"unusual traffic"`, `"are you a robot"`
- Require the page text to be under 3000 characters AND match 2+ phrases
- Return `{ error: "blocked", blocked: true }` with status 200 so the client can distinguish it from a real error
- In `WebProxy.tsx`, check for `data.blocked` flag instead of scanning HTML client-side

### Summary of changes
| File | Change |
|------|--------|
| `WebProxy.tsx` | Remove bot-phrase scanning (lines 43-65). Check `data.blocked` flag from response instead. |
| `proxy-web/index.ts` | Add server-side bot detection with strict criteria (short page + multiple specific phrases). Return `blocked: true` flag. |


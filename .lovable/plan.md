

# Fix Web Mode: Sites Refusing to Load in Iframe

## Problem
When users search or navigate to Google, DuckDuckGo, Bing, and many other websites in "Web mode," the iframe shows a blank page or error. This is because these sites set HTTP headers (`X-Frame-Options: DENY` / `Content-Security-Policy: frame-ancestors 'none'`) that block embedding in iframes. This is a fundamental browser security restriction — no client-side workaround exists.

## Solution: Server-Side Proxy via Edge Function

Create a backend edge function that fetches the target URL server-side and returns the HTML content, which Bowser then renders in its sandboxed iframe (like it does for AI-generated pages). This sidesteps iframe restrictions entirely.

## Changes

### 1. New Edge Function: `supabase/functions/proxy-web/index.ts`
- Accepts `{ url: string }` in the request body
- Fetches the URL server-side using `fetch()`
- Returns the raw HTML content
- Rewrites relative URLs in the HTML to absolute URLs so assets (images, CSS) load correctly
- Adds base tag pointing to the original domain
- Strips problematic headers/scripts that would break sandboxed rendering

### 2. `src/bowser/BowserApp.tsx`
- Replace the direct `<iframe src={...}>` for web mode (lines 406-412) with a component that:
  - Calls the `proxy-web` edge function to fetch page HTML
  - Renders the result in a sandboxed iframe (similar to `Sandbox` component) or uses `srcdoc`
  - Shows a loading spinner while fetching
  - Shows an error state if the fetch fails

### 3. New Component: `src/bowser/components/WebProxy.tsx`
- Accepts `url` and `navigationId` props
- On mount / URL change, calls the proxy edge function
- Renders fetched HTML in a sandboxed iframe using `srcdoc`
- Injects a `<base href="...">` tag so relative links resolve correctly
- Intercepts link clicks and form submissions, routing them back through the proxy

### 4. `src/bowser/utils/navigation.ts`
- When in default (new-tab) mode and user types a plain search query, route it through AI-generated search results instead of trying to embed a search engine page (since search engine results pages are particularly hostile to iframing)
- Keep direct URL navigation going through the proxy for regular websites

## Technical Details

```text
User types "cats" in omnibar
       │
       ▼
parseOmniboxInput() decides: search query
       │
       ▼
  Option A: Route to proxy-web edge function
            which fetches DuckDuckGo results
            and returns HTML for srcdoc rendering
       │
  Option B: Route to AI generate instead,
            producing a search-results-like page
            (simpler, more reliable)
```

### Proxy approach limitations
- JavaScript-heavy SPAs (React/Angular sites) won't work — only static/server-rendered HTML
- Some sites detect proxy patterns and block them
- Authentication-gated content won't work
- This is best-effort; some sites will still fail

### Recommended hybrid approach
- For **search queries**: Route through AI generation (already works well) — this avoids proxy complexity for the most common failure case
- For **direct URL navigation**: Use the proxy edge function as a best-effort renderer
- Show a "Open in new tab" fallback button when proxy rendering fails, using `window.open(url, '_blank')`

## File Summary

| File | Change |
|---|---|
| `supabase/functions/proxy-web/index.ts` | **New** — server-side URL fetcher |
| `src/bowser/components/WebProxy.tsx` | **New** — renders proxied HTML in sandboxed iframe |
| `src/bowser/BowserApp.tsx` | Replace direct iframe with `WebProxy` component |
| `src/bowser/utils/navigation.ts` | Route search queries to AI mode instead of web mode |


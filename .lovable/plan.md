

# Fix: Missing Stylesheet References in Sandbox Preview

## Problem

The Sandbox content extraction logic (lines 162-195 in `Sandbox.tsx`) only extracts two things from the generated HTML's `<head>`:
- Google Fonts `<link>` tags (href starting with `https://fonts.googleapis.com/`)

Everything else in `<head>` is discarded — including any `<style>` tags the AI generates for custom CSS (font-face declarations, custom utility classes, component styles). These styles are silently dropped, causing the rendered page to look broken.

## Root Cause

In `Sandbox.tsx`, the content pipeline:
1. Extracts `<body>` innerHTML → sends as `html`
2. Extracts font `<link>` hrefs → sends as `linkTags`
3. **Drops all `<style>` tags from `<head>`** — never forwarded to the iframe

The iframe shell's `CONTENT_UPDATE` handler (line 86) only sets `body.innerHTML` and injects font `<link>` elements. There is no mechanism to inject `<style>` blocks.

## Fix

### 1. `src/bowser/components/Sandbox.tsx` — Extract and forward `<style>` tags

In the `useEffect` that processes `htmlContent`:
- After extracting font `<link>` hrefs, also extract all `<style>` tag contents from the `<head>` section
- Send them as a new `styleTags` array in the `CONTENT_UPDATE` message

In the iframe shell's `CONTENT_UPDATE` message handler:
- Remove previously injected `<style data-bowser-style>` elements
- Inject each received style block as a new `<style data-bowser-style>` element in `<head>`

### 2. CSP adjustment (if needed)

The current CSP already has `style-src 'unsafe-inline'`, so dynamically created `<style>` elements will work. No CSP change needed.

### Files Changed

| File | Change |
|---|---|
| `src/bowser/components/Sandbox.tsx` | Extract `<style>` from generated `<head>`, forward via postMessage, inject in iframe shell handler |




# Fix URL Resolution in Web Mode

## Problem
The URL detection regex in `parseOmniboxInput()` (navigation.ts line 38) is too restrictive:

```
/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i
```

This fails to match URLs with:
- Query strings (`?q=hello&lang=en`)
- Ports (`localhost:3000`, `site.com:8080`)
- Hash fragments (`#section`)
- Special path characters (`+`, `~`, `@`, `:`)
- Complex paths (`/path/to/page.html`)

When a URL fails this regex, it falls through to the default case (line 63) which routes to **AI generation** instead of **web proxy** — so the site never loads.

The same overly-strict regex is duplicated on line 54 for the AI rebuild check.

## Fix

### File: `src/bowser/utils/navigation.ts`

**Replace the URL detection logic** (lines 37-43 and line 54) with a more robust approach:

1. Replace the regex with a function that uses `new URL()` parsing as the primary check, falling back to a simple heuristic (contains a dot, no spaces) for bare domains like `google.com`:

```typescript
function looksLikeUrl(input: string): boolean {
  // Already has protocol
  if (/^https?:\/\//i.test(input)) {
    try { new URL(input); return true; } catch { return false; }
  }
  // No spaces, contains a dot → likely a domain
  if (!input.includes(' ') && /^[\w-]+(\.[\w-]+)+/.test(input)) {
    try { new URL(`https://${input}`); return true; } catch { return false; }
  }
  return false;
}
```

2. Use this function on line 40 and line 54 instead of the restrictive regex
3. Also update the **default fallback** (line 63): when `currentKind` is `new-tab`, `settings`, `history`, or `bookmarks`, check if input looks like a URL and route to web mode — currently these all go to AI mode

### No other files change
The proxy edge function, WebProxy component, and omnibox hook all work correctly — the only bug is the URL detection gate.


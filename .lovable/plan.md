

# Verify & Refactor — Full Platform Audit

## Issues Found

### Critical: CSS/Interactivity Broken in Create Mode
1. **Sandbox CSP blocks Tailwind CDN**: The iframe's Content-Security-Policy has `connect-src 'none'`, which prevents the Tailwind CDN (`cdn.tailwindcss.com`) from fetching its JIT-compiled CSS at runtime. Tailwind CDN needs `connect-src` to fetch the CSS it generates. This means **generated pages may render unstyled** (missing Tailwind utilities).
2. **sanitizeHtml strips interactive handlers**: `sanitizeHtml()` removes ALL `on*` event handlers (`onclick`, `onsubmit`, etc.). The AI intentionally generates `onclick="BowserAPI.performAction(...)"` and form `onsubmit` handlers for interactivity. The sanitizer **kills all buttons and forms** in AI-generated pages.
3. **sanitizeHtml applied to WebProxy**: Proxied real websites also have their event handlers stripped, breaking interactive sites.
4. **Sandbox CSP blocks external images**: `img-src data: blob:` blocks `https://` images. AI-generated pages with external image references show broken images.

### Moderate
5. **SettingsTab causes HMR invalidation**: `applyBowserTheme` and `getEffectiveTheme` are exported from `SettingsTab.tsx` (a lazy-loaded component), causing Vite HMR to invalidate and do a full reload every time settings change.
6. **Empty desktop "More" dropdown**: The desktop address bar "More options" button opens an empty menu.
7. **Unused `prevPage` variable** in `handleBack` (line 125 of BowserApp).

---

## Plan

### 1. Fix Sandbox CSP (Critical)

Update `SHELL_HTML` in `Sandbox.tsx` to allow:
- `img-src data: blob: https:` — permit external images
- `connect-src https://cdn.tailwindcss.com` — allow Tailwind CDN to fetch JIT CSS
- Keep `script-src 'unsafe-inline' https://cdn.tailwindcss.com` as-is

### 2. Fix sanitizeHtml to Preserve BowserAPI Calls (Critical)

Rewrite `src/lib/sanitize.ts`:
- **Do NOT strip event handlers** from AI-generated content in the Sandbox — the Sandbox iframe already sandboxes scripts safely via `sandbox="allow-scripts allow-forms"` (no `allow-same-origin` means it can't access parent).
- For **WebProxy** (proxied external sites), keep the current sanitization (strip scripts) but the iframe already has `sandbox="allow-scripts allow-same-origin allow-forms"`.
- Solution: Create two functions:
  - `sanitizeProxiedHtml(html)` — strips `<script>` tags and `javascript:` URLs (for WebProxy)
  - `sanitizeAIHtml(html)` — strips only `<script>` tags but **preserves** inline event handlers that call `BowserAPI.*` (for Sandbox — although Sandbox doesn't use sanitize currently, this keeps it available)
- Actually, reviewing the code: **Sandbox.tsx does NOT call sanitizeHtml** — it sends raw content via postMessage. Only WebProxy calls it. So the fix is: stop stripping `on*` event handlers in sanitizeHtml, since:
  - Sandbox doesn't use it
  - WebProxy's iframe has `sandbox` attribute which prevents scripts from escaping

### 3. Extract Theme Utils from SettingsTab (Moderate)

Move `applyBowserTheme`, `getEffectiveTheme`, and related helpers out of `SettingsTab.tsx` into a new file `src/bowser/utils/theme.ts`. Update imports in `BowserApp.tsx` and `SettingsTab.tsx`. This fixes the HMR invalidation warning.

### 4. Remove Empty Desktop "More" Dropdown

The desktop address bar has a "More options" button that opens an empty dropdown. Either:
- Remove the button entirely on desktop (it serves no purpose)
- Or populate it with useful actions (Share, View source, etc.)

I'll remove it since no actions exist.

### 5. Clean Up Minor Code Issues

- Remove unused `prevPage` variable in `handleBack` (BowserApp.tsx line 125)
- Remove unused `nextPage` variable in `handleForward` (line 149)

---

## Files Changed

| File | Action |
|---|---|
| `src/bowser/components/Sandbox.tsx` | Fix CSP: allow `https:` images, allow Tailwind CDN `connect-src` |
| `src/lib/sanitize.ts` | Stop stripping event handlers (they're sandboxed by iframe attrs) |
| `src/bowser/utils/theme.ts` | **New** — extract `applyBowserTheme`, `getEffectiveTheme` |
| `src/bowser/components/SettingsTab.tsx` | Remove theme util exports, import from `utils/theme` |
| `src/bowser/BowserApp.tsx` | Import theme from `utils/theme`, remove unused vars, remove empty menu |
| `src/bowser/components/AddressBar.tsx` | Remove empty desktop "More options" button |

## What We Preserve

- All existing Sandbox interactivity (BowserAPI.navigate, performAction)
- WebProxy security (still strips `<script>` tags, iframe sandboxed)
- All tab management, keyboard shortcuts, side panel, bookmarks
- Mobile layout, bottom chrome, bottom sheet




# Auto-Fullscreen + Production Hardening Plan

## 1. Auto-Fullscreen on Session Start

The Fullscreen API requires a user gesture — browsers block `requestFullscreen()` without one. The approach:

- **On first user interaction** (click/keydown anywhere in the shell), request fullscreen automatically
- **Persist preference** in localStorage (`auto-fullscreen: true`), so returning users get the same behavior
- **Add a Settings toggle** ("Open in fullscreen") so users can disable it
- **Skip in iframes/preview** (Lovable editor context) to avoid errors

### Implementation
- **BowserApp.tsx**: Add a one-time `useEffect` that listens for the first `click` or `keydown` event on the document. On that event, call `shellRef.current.requestFullscreen()` if the `auto-fullscreen` setting is enabled and not already fullscreen. Remove the listener after firing once.
- **BrowserShell.tsx**: Forward a ref or expose the shell element so BowserApp can target it. Alternatively, target `document.documentElement`.
- **SettingsTab.tsx**: Add an "Open in fullscreen" toggle under Appearance, persisted via `useBowserSettings`.
- **useBowserSettings.ts**: Add `getAutoFullscreen()` / `setAutoFullscreen()` helpers.

## 2. Production Review & Refactoring

After thorough codebase review, here are the issues to address:

### A. Security Hardening
- **Sandbox CSP**: The Sandbox iframe CSP correctly blocks `connect-src` and `frame-src`. No changes needed.
- **Service worker guard in main.tsx**: Already strips SW in iframe/preview. Good.

### B. Code Quality Fixes
- **Duplicate "Live data" toggle in desktop menu**: The desktop dropdown menu (AddressBar lines 566-581) duplicates the globe icon already visible in the address bar. Remove the redundant dropdown entry — the globe button is sufficient.
- **Missing CSS comment marker**: Line 693 in `index.css` is missing the opening `/* =` for the COMMAND PALETTE section header. Fix the comment syntax.
- **Consistent `useCallback` usage**: Several inline arrow functions passed as props in BowserApp.tsx (e.g., `onToggleGrounding`, `onNewTab`) recreate on every render. Wrap them in `useCallback` for memoization consistency.

### C. Performance
- **Memoize heavy child components**: The `NewTab`, `HistoryTab`, `BookmarksTab` components receive new object/function props each render. Wrap key callbacks with `useCallback` (already partially done).
- **Lazy-load system tabs**: `HistoryTab`, `BookmarksTab`, `SettingsTab` can be `React.lazy()` loaded since they're not on the critical path.

### D. Accessibility Polish
- **Tab bar `role="tablist"`** is already correctly applied. Good.
- **Fullscreen button**: Update aria-label to reflect the new auto-fullscreen behavior.

### E. PWA / Deployment Readiness
- **`robots.txt` and `sitemap.xml`** already present. Good.
- **OG tags / meta**: Already configured. Good.
- **Canonical URL**: Already set. Good.

## File Changes Summary

| File | Changes |
|---|---|
| `src/bowser/hooks/useBowserSettings.ts` | Add `getAutoFullscreen` / `setAutoFullscreen` |
| `src/bowser/BowserApp.tsx` | Add auto-fullscreen on first interaction; wrap inline callbacks in `useCallback`; lazy-load system tab components |
| `src/bowser/components/SettingsTab.tsx` | Add "Open in fullscreen" toggle |
| `src/bowser/components/AddressBar.tsx` | Remove duplicate "Live data" toggle from desktop dropdown menu |
| `src/index.css` | Fix broken comment on line 693 |

## Technical Notes

- Fullscreen API is gated behind user gesture — the `click`/`keydown` listener pattern is the standard workaround
- `document.documentElement.requestFullscreen()` is the safest target (works even without a ref to the shell div)
- The iframe/preview guard in `main.tsx` will be extended to also skip auto-fullscreen attempts
- All settings default to enabled (`auto-fullscreen: true`) for new users; existing users get the same default


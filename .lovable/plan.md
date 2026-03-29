

## Remove Google Default & Create Bowser Install Landing Page

### What changes

**Goal**: Replace all `google.com` references as the default web tab with a branded Bowser install/welcome page that serves as the perfect landing experience.

### 1. Remove Google as default URL (3 files)

- **`src/bowser/types.ts`** line 94: Change `browserUrl` default from `'https://www.google.com/webhp?igu=1'` to `undefined`
- **`src/bowser/BowserApp.tsx`** lines 131-136: `handleHome` for web tabs — instead of navigating to Google, switch to `'new-tab'` (same as AI tabs do)
- **`src/bowser/BowserApp.tsx`** line 152: `handleToggleBrowserMode` — remove Google URL when switching to web mode, set to `undefined`

### 2. Redesign NewTab as the Bowser install/welcome page

Transform `NewTab.tsx` into a polished, app-store-quality landing page for first-time users (when `isFirstRun` is true). Returning users still see bookmarks/recent activity.

**First-run install page layout:**
- Large Bowser PWA icon (`pwa-192x192.png`) centered at top
- "Bowser" wordmark with tagline: "Your AI-powered browser. Search, create, and explore — all in one place."
- Three feature highlights with icons:
  - **Create mode** — "Generate any webpage instantly with AI"
  - **Web mode** — "Browse the real web with a built-in search"
  - **Live data** — "Ground AI responses with real-time information"
- Prominent **Install Bowser** button (triggers PWA install prompt)
- "Get started" button below that focuses the omnibox
- The existing omnibox stays functional at the top for immediate use

**Returning users**: Keep existing layout (bookmarks, recent prompts, continue browsing) unchanged.

### 3. Enhance InstallPrompt for reuse

Extract the PWA install logic into a shared hook (`useInstallPrompt`) so both the banner `InstallPrompt` and the new landing page install button can trigger the native install flow.

### Files to edit
- `src/bowser/types.ts` — Remove Google default URL
- `src/bowser/BowserApp.tsx` — Remove Google references in handleHome and handleToggleBrowserMode
- `src/bowser/components/NewTab.tsx` — Add install landing page for first-run state
- `src/bowser/hooks/useInstallPrompt.ts` — New shared hook for PWA install logic
- `src/bowser/components/InstallPrompt.tsx` — Refactor to use shared hook


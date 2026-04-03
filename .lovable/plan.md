

# Best Practices Refactor — Bowser

## Current State Assessment

Before planning changes, here's what **already works well**:
- **Types** exist in `src/bowser/types.ts` with `Tab`, `Page`, `Breadcrumb`, `TokenCount`, etc.
- **Hooks** exist: `useTabManager`, `useAIGenerate`, `useOmnibox`, `useBowserSettings` — all strongly typed
- **BowserApp** is already thin orchestration importing those hooks
- **Keyboard shortcuts** (Ctrl+T/W/L/K/1-9) already implemented
- **AddressBar** has `aria-label`, Escape handling, search history dropdown
- **BrowserShell** has `role="tablist"`, `role="tab"`, `aria-selected`, drag-and-drop
- **AiSidePanel** has streaming, stop button, four actions (Summarize, Key Points, Simplify/Explain, Ask)
- **WebProxy** component exists with proxy + fallback "Open in new tab"
- **Settings** already uses reusable `SettingsSection`/`SettingsRow` components
- **NewTab** has first-run vs returning user views, mode toggle

The plan below targets **genuine gaps** without duplicating existing code into new locations (which would break imports and add maintenance burden).

---

## Changes

### 1. Shared Types — Extend `src/bowser/types.ts`

Add missing interfaces to the existing types file (not a new location — moving would break 20+ imports for no benefit):

- `AIJobState` with `status: 'idle' | 'loading' | 'streaming' | 'done' | 'error'`, `content`, `error`, `abortController`
- `BowserSettings` with `theme`, `searchEngine`, `fontSize`, `tabLimit`
- `NavigationState` with `canGoBack`, `canGoForward`

Export a barrel from `src/bowser/types.ts` (already the canonical location).

### 2. Create `useAIJob` Hook — `src/bowser/hooks/useAIJob.ts`

Extract the ad-hoc async state from `AiSidePanel` into a reusable hook:
- Manages `AIJobState` (idle/loading/streaming/done/error)
- `start(action, question?)` — begins streaming, updates state
- `abort()` — calls AbortController
- `reset()` — returns to idle
- `retry()` — re-runs last action
- Cleanup on unmount via AbortController

### 3. Create `StateDisplay` Component — `src/bowser/components/StateDisplay.tsx`

A unified component for loading, empty, and error states:
- `<StateDisplay type="loading" message="..." />` — shimmer skeleton
- `<StateDisplay type="empty" icon="..." title="..." subtitle="..." />`
- `<StateDisplay type="error" message="..." onRetry={fn} />` — error with retry button
- Use in: AiSidePanel, WebProxy, NewTab empty states

### 4. Fix AiSidePanel — Use `useAIJob` + `StateDisplay`

- Replace inline `useState` for response/loading/error/activeAction with `useAIJob`
- Add "Generate" as a fourth quick action alongside Summarize, Explain, Ask
- Use `StateDisplay` for loading skeleton, error with retry
- Add blinking cursor class during streaming (already has `streaming-cursor` CSS class)

### 5. Fix NewTab — Deferred Sections + Auto-focus

- Move `recentPrompts` and `recentActivity` computation into a `useEffect` with `setTimeout(0)` so first paint is instant (just the search bar and branding)
- Auto-focus the search input on mount (already has `autoFocus` but ensure it works on tab switch too via `useEffect`)
- Add empty state using `StateDisplay` when no recent items exist (currently shows nothing — add a subtle "No recent activity" message)

### 6. Fix WebProxy — Use `StateDisplay` + Better Error Handling

- Replace inline loading/error JSX with `StateDisplay`
- Add `sandbox="allow-scripts allow-same-origin allow-forms"` to the iframe (verify current sandbox attrs)
- Ensure "Open in new tab" fallback always visible on error

### 7. Fix Settings — Schema-Driven Rendering

Replace manual `SettingsSection`/`SettingsRow` blocks with a typed schema array:

```typescript
interface SettingEntry {
  key: string;
  label: string;
  description: string;
  section: string;
  sectionIcon: string;
  type: 'segmented' | 'action';
  options?: { value: string; label: string }[];
  onAction?: () => void;
}
```

Render from the schema array with a single `.map()`. Persist changes immediately (already does this).

### 8. Accessibility Improvements

- **AddressBar**: Add `role="combobox"`, `aria-expanded`, `aria-controls` linking to search history dropdown
- **Side panel**: Add focus trap when open (trap Tab key within panel, return focus on close)
- **Tab strip**: Already has `role="tablist"` + `role="tab"` + `aria-selected` — verify `aria-controls` links to viewport
- **Escape key**: Already blurs omnibox — add: close side panel on Escape when panel is focused
- Audit all icon-only buttons for `aria-label` (most already have them — fill any gaps)

### 9. Omnibox Enhancements

- Add a mode badge inside the address bar showing "Web" or "Create" based on current tab mode (small pill/chip left of input)
- Add 200ms debounce before parsing input for suggestion display (not for submit — submit remains instant)

### 10. Error Consistency in AI Generation

- In `useAIGenerate`, replace the inline error HTML with a structured error that `Sandbox` can render using `StateDisplay`
- Add a retry callback that re-runs the last generation

---

## Files Changed

| File | Action |
|---|---|
| `src/bowser/types.ts` | Add `AIJobState`, `BowserSettings`, `NavigationState` |
| `src/bowser/hooks/useAIJob.ts` | **New** — reusable streaming AI state hook |
| `src/bowser/components/StateDisplay.tsx` | **New** — unified loading/empty/error component |
| `src/bowser/components/AiSidePanel.tsx` | Refactor to use `useAIJob` + `StateDisplay`, add Generate action |
| `src/bowser/components/NewTab.tsx` | Deferred sections, auto-focus, empty state |
| `src/bowser/components/WebProxy.tsx` | Use `StateDisplay`, verify sandbox attrs |
| `src/bowser/components/SettingsTab.tsx` | Schema-driven rendering |
| `src/bowser/components/AddressBar.tsx` | Mode badge, combobox ARIA, debounced suggestions |
| `src/bowser/components/BrowserShell.tsx` | Focus trap for side panel, aria-controls |
| `src/bowser/hooks/useAIGenerate.ts` | Structured error state with retry |
| `src/bowser/BowserApp.tsx` | Escape closes side panel |

## What We Preserve

- All existing hooks stay in `src/bowser/hooks/` (no pointless relocation)
- All existing types stay in `src/bowser/types.ts`
- SSE streaming from `generate-page` edge function — untouched
- Web/Create mode toggle — untouched
- Multi-tab support, drag-and-drop, pinning — untouched
- All keyboard shortcuts — untouched (Escape for panel added)


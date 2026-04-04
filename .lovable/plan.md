

# Review: Proposed Refactoring Items vs Current Codebase

After reading the existing code, here is my assessment of each item. Most of what's proposed **already exists** in a slightly different shape. I'll flag what's genuinely useful vs redundant.

---

## Already Implemented (Skip or Minor Polish)

| # | Proposal | Current State | Verdict |
|---|----------|---------------|---------|
| 1 | Shared types in `src/types/bowser.ts` | `src/bowser/types.ts` already has `Tab`, `TabKind`, `Breadcrumb`, `Page`, `FormFieldState`, `TokenCount`, etc. | **Skip.** Moving to `src/types/` adds indirection with no benefit. The existing types are already well-structured. |
| 2 | `useTabs` hook | `useTabManager` already does this: tab array, activeTabIndex, addTab, closeTab, switchTab, updateTab, reorder, pin, rename, reopen closed. | **Skip.** Renaming adds churn with zero value. |
| 2 | `useNavigation` hook | Back/forward/refresh logic exists in `BowserApp.tsx` (lines 111–168) handling both AI and web history. | **Could extract** but it's ~60 lines tightly coupled to tab state. Low priority. |
| 2 | `useOmnibox` hook | Already exists at `src/bowser/hooks/useOmnibox.ts` with `parseOmniboxInput` and search engine routing. | **Skip.** |
| 2 | `useAIJob` hook | Already exists as `useAIGenerate` with AbortController map, streaming, cleanup. | **Skip.** It does more than the proposal (multi-tab abort tracking). |
| 2 | `useBowserSettings` hook | Already exists at `src/bowser/hooks/useBowserSettings.ts` with typed getters/setters for font size, tab limit, search engine. | **Skip.** |
| 3 | Thin BowserApp | BowserApp already imports `useTabManager`, `useOmnibox`, `useAIGenerate`, `useBowserSettings`. Keyboard shortcuts (Ctrl+T/W/L/K/1-9, Escape) are already wired in `BrowserShell`. | **Skip.** Already done. |
| 5 | New Tab static first paint | `NewTab` uses `useMemo` for recent prompts and activity — no async calls on mount. | **Already static.** Auto-focus and empty states are minor polish. |
| 10 | Accessibility | `BrowserShell` already has `role='tablist'`, `role='tab'`, `aria-selected`, `aria-label` on icon buttons. `AddressBar` has `role='combobox'`. `AiSidePanel` has `aria-label`, `aria-live`, `role='toolbar'`. | **Largely done.** Focus trapping on side panel is the one gap. |

## Worth Doing (Genuine Improvements)

| # | Proposal | Value | Effort |
|---|----------|-------|--------|
| 4 | Omnibox mode badge | Show "Web" or "Create" badge inside address bar based on current tab mode. Nice UX clarity. | Small |
| 5 | New Tab auto-focus | Auto-focus search bar when new tab opens. | Trivial |
| 5 | Empty state for recent items | Show a message when no recent activity exists. | Trivial |
| 6 | AI Side Panel error retry | Add a retry button on error in `AiSidePanel`. Currently shows error text but no retry action. | Small |
| 7 | WebProxy blocked-site fallback | `WebProxy` exists but could add a cleaner "blocked site" UI with "Open in new tab" button when proxy fails. Currently shows generic error. | Small |
| 8 | Settings schema-driven rendering | Currently manual rows. A schema array would reduce code and make adding settings easier. | Medium |
| 9 | StateDisplay component | Centralizing loading/empty/error states would reduce duplication across panels. | Medium |
| 10 | Side panel focus trap | The AI side panel doesn't trap focus when open. This is the main a11y gap. | Small |

---

## Recommendation

**Don't do items 1, 2, 3** — they propose rebuilding what already exists under different names. This is pure churn.

**Do these 8 targeted improvements:**

1. **Omnibox mode badge** — Add a small "Web" / "Create" chip inside `AddressBar` based on `activeTab.tabKind`
2. **New Tab auto-focus** — `useEffect` to focus the search input on mount in `NewTab`
3. **New Tab empty state** — Show friendly message when `recentActivity` and `recentPrompts` are empty
4. **AI Panel retry button** — Add a "Try again" button next to error messages in `AiSidePanel`
5. **WebProxy fallback UI** — Improve error state with "Open in new tab" button and friendly messaging
6. **Schema-driven Settings** — Replace manual setting rows with a typed config array in `SettingsTab`
7. **StateDisplay component** — Create `src/bowser/components/StateDisplay.tsx` for reusable loading/empty/error states
8. **Side panel focus trap** — Trap focus within `AiSidePanel` when open, release on close

### Files to change

| File | Change |
|---|---|
| `src/bowser/components/AddressBar.tsx` | Add mode badge (Web/Create) |
| `src/bowser/components/NewTab.tsx` | Auto-focus search, add empty states |
| `src/bowser/components/AiSidePanel.tsx` | Add retry button on error, use StateDisplay |
| `src/bowser/components/WebProxy.tsx` | Improve error/blocked fallback UI |
| `src/bowser/components/SettingsTab.tsx` | Refactor to schema-driven rendering |
| `src/bowser/components/StateDisplay.tsx` | **New** — reusable loading/empty/error component |


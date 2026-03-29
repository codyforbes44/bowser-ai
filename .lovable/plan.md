

# Bowser: Architecture, State, Accessibility, and Honesty Fixes

## Problems Found

After thorough review, these are the real issues — not cosmetic, but structural, behavioral, and honest-UI problems.

### 1. Stale closure bug in `generate`
`generate` captures `activeTabIndex` at call time and uses it throughout the async stream. If the user switches tabs mid-generation, updates write to the wrong tab. Fix: capture `tabId` instead of index, and resolve the index inside each `updateTab` call using the `tabs` array, or switch `updateTab` to accept a tab ID.

### 2. Race condition in `handleNewTab` / `handleNewAiTab`
Both call `setActiveTabIndex(tabs.length)` outside the `setTabs` updater. Two rapid calls can set the same index. Fix: use a single `setTabs` + derive activeTabIndex, or use a ref-based approach.

### 3. `handleNewAiTab` is a lie
It does the exact same thing as `handleNewTab` — creates a `new-tab`. The command palette advertises "New AI Tab" but delivers a generic new tab. Fix: either make it actually open a tab in AI mode, or remove the distinction.

### 4. Dead prop drilling through BrowserShell
`BrowserShell` receives 7 bookmark-related props (`bookmarks`, `bookmarkFolders`, `onCreateBookmarkFolder`, etc.) that it never uses or passes down. These were needed when NewTab was rendered inside BrowserShell with bookmark management. Now NewTab is a child passed via `children`. Fix: remove all unused bookmark props from BrowserShell's interface.

### 5. Settings page has fake controls
"Default Search Engine" dropdown and "Enable AI Search" toggle look functional but do nothing — no persistence, no wiring. This violates "keep Bowser honest." Fix: remove them, or wire them to actual state with persistence.

### 6. Tab close index edge case
When closing the active tab that's also the last tab, `activeTabIndex >= index && activeTabIndex > 0` decrements correctly, but the state updates (`setTabs` and `setActiveTabIndex`) are separate calls creating a render frame where `activeTabIndex` may point beyond the array. Fix: combine into a single state update or guard `activeTab` derivation.

### 7. AddressBar duplicates navigation parsing
`AddressBar.navigateWithQuery` has its own URL validation, breadcrumb parsing, and navigation mode logic that partially overlaps with `parseOmniboxInput` in `utils/navigation.ts`. Fix: consolidate — AddressBar should delegate all parsing to the navigation utility, keeping only UI concerns (focus, display, error state).

### 8. Missing accessibility attributes
- CommandPalette lacks `role="dialog"`, `aria-modal="true"`, `aria-label`
- Web iframe (line 507) missing `title` attribute — a11y violation
- Tab close buttons lack `aria-label` differentiation (all say "Close tab" — should include tab name)
- History/Bookmarks search inputs lack `role="searchbox"`

## Plan

### A. Fix tab state race conditions (`BowserApp.tsx`)
- Change `updateTab` to accept a tab ID instead of index, resolving index internally
- In `generate`, capture `tabId` once and use ID-based updates throughout
- Combine `handleNewTab`'s `setTabs` + `setActiveTabIndex` into a single state derivation
- Make `handleNewAiTab` create a tab with `tabKind: 'ai'` so it's actually distinct

### B. Remove dead BrowserShell props (`BrowserShell.tsx`)
- Remove `bookmarks`, `bookmarkFolders`, `onCreateBookmarkFolder`, `onRenameBookmarkFolder`, `onDeleteBookmarkFolder`, `onMoveBookmark`, `onNavigateToBookmark` from the interface and destructure
- Remove corresponding props at the call site in `BowserApp.tsx`

### C. Remove fake settings controls (`SettingsTab.tsx`)
- Remove "Default Search Engine" and "Enable AI Search" sections entirely — they're dishonest
- Keep Appearance, Keyboard Shortcuts, and Privacy (Clear Data) which are functional

### D. Consolidate omnibox parsing (`AddressBar.tsx`, `utils/navigation.ts`)
- Move URL validation into `parseOmniboxInput` — it should return an `error` field when input is invalid
- AddressBar's `navigateWithQuery` becomes a thin wrapper that calls `parseOmniboxInput`, checks for errors, and delegates to `onNavigate`
- Update `NavigationDecision` type to include optional `error: string`

### E. Fix tab close state consistency (`BowserApp.tsx`)
- Guard `activeTab` derivation with bounds check: `tabs[Math.min(activeTabIndex, tabs.length - 1)]`
- In `handleCloseTab`, compute the new active index deterministically before setting state

### F. Add missing accessibility attributes
- CommandPalette: add `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`
- Web iframe: add `title="Web content"`
- Tab close buttons: include tab title in aria-label (e.g., `aria-label="Close History tab"`)

## Files touched
| File | Changes |
|------|---------|
| `BowserApp.tsx` | ID-based updateTab, fix new-tab race, remove dead BrowserShell props, fix close edge case |
| `BrowserShell.tsx` | Remove 7 unused bookmark props from interface |
| `SettingsTab.tsx` | Remove fake Search Engine and AI Search controls |
| `AddressBar.tsx` | Delegate parsing to navigation utility |
| `utils/navigation.ts` | Add validation/error support to `parseOmniboxInput` |
| `CommandPalette.tsx` | Add dialog ARIA attributes |

No new dependencies. No behavioral changes to working features. Build-safe.


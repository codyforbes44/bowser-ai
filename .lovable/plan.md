

# Bowser: Broken References and Behavioral Issues Audit

## Status: No build-breaking import/reference errors found

All file imports, CSS custom property references (`--bw-*`), component prop interfaces, and type references are consistent across the codebase. The app compiles and runs.

## Real issues found (behavioral, not import-level)

### 1. `handleNewAiTab` creates a tab with `tabKind: 'ai'` but no content
`BowserApp.tsx:320-327` — The tab is created as `new-tab` then immediately mutated to `tabKind: 'ai'`. But an AI tab with no history, no `generatedContent`, and `currentIndex: -1` falls through to the `Sandbox` component (line 544), which receives an empty `displayContent` string. The `isNewTab` guard on line 463 only catches `new-tab` kind or `currentIndex === -1 && tabKind !== 'web'` — so it *does* catch this case. But the display shows a NewTab page while the tab bar says "AI" with an AI icon, which is confusing. **Fix**: Either keep `tabKind: 'new-tab'` and set it to `'ai'` on first prompt (current `onCreatePage` already does this), or make the NewTab UI aware it's in AI-pre-mode and adjust copy accordingly.

### 2. `AddressBar` still has partial omnibox logic duplication
`AddressBar.tsx:132-160` — `navigateWithQuery` calls `parseOmniboxInput` but then re-implements breadcrumb-based create/edit routing (lines 144-156) that duplicates logic already in `BowserApp.handleOmnibarNavigate` (lines 212-249). The AddressBar decides `onNavigate('create', ...)` vs `onNavigate('edit', ...)` based on breadcrumb comparison, while BowserApp also makes routing decisions based on `parseOmniboxInput`. This means the same input is parsed twice with potentially divergent results. **Fix**: AddressBar should only call `onNavigate('create', rawInput)` and let BowserApp handle all routing decisions.

### 3. `parseOmniboxInput` returns error but caller ignores it
`BowserApp.tsx:216-219` — When `decision.error` is set, the function returns early without any user feedback. The error is only shown if AddressBar calls `parseOmniboxInput` independently (which it does at line 134). But if `handleOmnibarNavigate` is called from HistoryTab or BookmarksTab navigation paths, errors are silently swallowed.

### 4. `handleOmnibarNavigate` uses index-based `updateTab` for system page navigation
`BowserApp.tsx:244-248` — Uses `updateTab(activeTabIndex, ...)` (index-based) while the rest of the function should use `updateTabById`. This is inconsistent with the ID-based migration and could cause stale-index bugs if the tab array changes between the `parseOmniboxInput` call and the state update.

### 5. `InstallPrompt` bypasses the storage adapter
`InstallPrompt.tsx:11,42` — Uses raw `localStorage.getItem/setItem('bowser-install-dismissed')` instead of `getStorageItem/setStorageItem`. While not broken (the key already has the `bowser-` prefix hardcoded), it's inconsistent with the rest of the codebase and won't benefit from the migration system.

### 6. Missing `key` on Sandbox iframe causes stale content
`BowserApp.tsx:544-548` — The `Sandbox` component doesn't receive a `key` prop tied to `navigationId`, so when navigating between AI pages, the iframe shell persists and relies on `postMessage` content updates. This works but means the sandbox never fully resets. The web iframe (line 536-542) correctly uses `key={activeTab.navigationId}`. Adding a `key` to Sandbox would ensure clean resets on navigation.

### 7. CSS class `bowser-page-bg`, `bowser-list-item`, `bowser-settings-card` defined but never used
`index.css:686-690` — Four utility classes are defined but not referenced by any component. They're dead CSS from a previous iteration.

## Recommended fixes

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `BowserApp.tsx` | Keep `handleNewAiTab` as `new-tab` kind (revert line 322 mutation) | Removes confusing AI-icon-on-empty-tab state |
| 2 | `AddressBar.tsx` | Simplify `navigateWithQuery` to always call `onNavigate('create', query)` — remove breadcrumb comparison logic | Eliminates parsing duplication |
| 3 | `BowserApp.tsx` | In `handleOmnibarNavigate`, handle breadcrumb-based create/edit decision (moved from AddressBar) | Single source of routing truth |
| 4 | `BowserApp.tsx:222,231,244` | Replace `updateTab(activeTabIndex, ...)` with `updateTabById(activeTab.id, ...)` | Consistent ID-based updates |
| 5 | `InstallPrompt.tsx` | Use `getStorageItem`/`setStorageItem` for `install-dismissed` key | Consistency |
| 6 | `BowserApp.tsx` | Add `key={activeTab.navigationId}` to `Sandbox` component | Clean iframe resets |
| 7 | `index.css` | Remove unused `.bowser-page-bg`, `.bowser-list-item`, `.bowser-settings-bg`, `.bowser-settings-card` classes | Dead code cleanup |

No new dependencies. All fixes are behavioral corrections and consistency improvements. Build-safe.


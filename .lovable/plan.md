

## Make Web Mode the Default for New Sessions

### Current Behavior
- New tabs have `tabKind: 'new-tab'`, and `isBrowserMode` is derived as `tabKind === 'web'` → always `false` on the new-tab page
- The mode toggle on NewTab calls `handleToggleBrowserMode`, which mutates the tab's `tabKind` (destroying the new-tab view)
- Result: new sessions always start in Create mode

### What Changes

#### 1. Add local mode state to NewTab (default: Web)
Instead of deriving mode from the parent tab's `tabKind`, NewTab will manage its own `localBrowserMode` state initialized to `true`. The mode toggle chip will flip this local state without changing the tab kind. This keeps the install landing page visible while showing "Web" as the active mode.

#### 2. Add `onWebNavigate` prop to NewTab
NewTab needs a way to trigger web navigation. BowserApp will pass `handleOmnibarNavigate` (or a wrapper) so that when the user submits in Web mode, it routes through the omnibox logic (URL detection, search engine fallback).

**Submit logic:**
- Web mode → call `onWebNavigate(prompt)` which uses `handleOmnibarNavigate` to navigate or search
- Create mode → call existing `onCreatePage(prompt)` as before

#### 3. Update BowserApp to pass the web navigate handler
Wire `handleOmnibarNavigate` into the NewTab component. Remove `isBrowserMode` and `onToggleBrowserMode` props from NewTab (mode is now local).

### Files to Edit
- **`src/bowser/components/NewTab.tsx`** — Add local `localBrowserMode` state (default `true`), add `onWebNavigate` prop, update submit handler to branch on mode, update toggle to use local state
- **`src/bowser/BowserApp.tsx`** — Pass `onWebNavigate` callback wrapping `handleOmnibarNavigate`, remove `isBrowserMode`/`onToggleBrowserMode` props from NewTab usage


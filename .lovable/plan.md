

# Default to Web Mode with Google.com

## What changes
Every new session and new tab should open in `web` mode pointing at `https://google.com` instead of the `new-tab` system page.

## Files to modify

### 1. `src/bowser/types.ts` — `createTab` function
- Change default parameter from `'new-tab'` to `'web'`
- When `tabKind` is `'web'`, auto-set `browserUrl` to `'https://google.com'`, `breadcrumb` to `{ sitename: 'https://google.com', page: '' }`, `webHistory` to `['https://google.com']`, and `webHistoryIndex` to `0`

### 2. `src/bowser/hooks/useTabManager.ts`
- Update all `createTab('new-tab')` calls to `createTab('web')` (lines 9, 33, 48, 92) — this covers: initial session with no saved workspace, new tab button, last-tab-closed replacement, and reopen-closed fallback
- The reopen-closed `else` branch (line 105) should also default to `'web'` instead of `'new-tab'`

### 3. `src/bowser/store/session.ts` — `restoreWorkspace`
- Change fallback `createTab(s.tabKind || 'new-tab')` to `createTab(s.tabKind || 'web')` so restored tabs with missing kind default to web mode

## What stays the same
- The `NewTab` component still exists and can be navigated to via system pages, but is no longer the default
- Existing saved workspaces restore normally since they have explicit `tabKind` values


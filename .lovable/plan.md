

## Review: Back/Forward Arrow History Support

### Current State

**AI/Create mode — back/forward works within a session:**
- Each AI-generated page is pushed to `tab.history[]` with a `currentIndex` pointer
- `handleBack` decrements `currentIndex`, `handleForward` increments it
- New navigation forks history (standard browser behavior)
- Buttons correctly enable/disable based on index position

**Web mode — back/forward is fully disabled:**
- `canGoBack` and `canGoForward` are hardcoded to `false` for `tabKind === 'web'`
- `handleBack` and `handleForward` early-return for web tabs
- The iframe manages its own internal history, but the app's arrows ignore it entirely
- Users browsing real websites have no way to use the back/forward buttons

**Session restore — history is lost on reload:**
- `saveWorkspace` only persists tab metadata (kind, URL, breadcrumb, lastPrompt)
- The `history[]` array and `currentIndex` are NOT saved
- After page reload, back/forward won't work until new pages are generated in that session

### Findings Summary

| Scenario | Back/Forward | Status |
|----------|-------------|--------|
| AI pages within session | Works | OK |
| AI pages after reload | Lost — no persistence | Issue |
| Web iframe tabs | Fully disabled | Issue |
| System pages (history, settings) | N/A (no navigation stack) | OK |

### Recommended Fix (2 changes)

#### 1. Enable back/forward for web iframe tabs
- Track a list of visited URLs per web tab in `tab.history` (or a parallel `webHistory` array)
- When user navigates to a new URL in web mode, push the URL to the history stack
- `handleBack` for web tabs: pop to previous URL, update `browserUrl` and `navigationId`
- `handleForward`: move forward in the URL stack
- Update `canGoBack`/`canGoForward` to check web history length

**Files**: `BowserApp.tsx` (remove web early-returns, update canGo props), `useOmnibox.ts` (push URL to history on web navigation), `useTabManager.ts` (no changes needed)

#### 2. Persist AI page history across reloads
- Extend `SerializedTab` in `session.ts` to include a compact version of history (prompt + breadcrumb per page, not full HTML)
- On restore, re-populate `tab.history` with stub entries that can be regenerated on demand
- Or: persist the last N pages' HTML (capped at ~500KB total per tab to avoid localStorage quota)

**Files**: `store/session.ts` (extend serialization), `useTabManager.ts` (restore logic)

### Technical Details

**Web history tracking approach:**
```text
Tab.webHistory: string[]    // stack of URLs visited
Tab.webHistoryIndex: number // current position
```

On web navigate: push URL, set index to end.
On back: decrement index, set browserUrl to webHistory[index].
On forward: increment index, set browserUrl.

**AI history persistence approach:**
Store only prompts + breadcrumbs (not HTML) — pages can be lazy-regenerated when the user navigates back after a reload. This keeps storage small.


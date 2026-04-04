

# Fix Settings/History/Bookmarks in Dropdown Menus

## Problem
- **Desktop menu**: The Settings, History, and Bookmarks buttons dispatch `bowser:open-system` custom events, but no listener exists anywhere in the codebase — clicks silently do nothing.
- **Mobile menu**: These three items are completely missing from the portal-rendered mobile overflow menu.

## Root cause
The `navigateToSystemPage()` function (from `useTabManager`) is the correct way to open system pages. The command palette already uses it. But the desktop menu uses unhandled custom events instead, and the mobile menu was never wired up.

## Fix

### 1. `src/bowser/components/AddressBar.tsx`
- Add `onOpenSettings`, `onOpenHistory`, `onOpenBookmarks` callback props to `AddressBarProps`
- **Desktop menu** (line 596-616): Replace all three `window.dispatchEvent(new CustomEvent('bowser:open-system', ...))` calls with direct calls to these new props
- **Mobile menu portal** (line 708-740): Add Settings, History, and Bookmarks menu items (with separator) after the existing items, calling the same props

### 2. `src/bowser/BowserApp.tsx`
- Pass three new props to `<AddressBar>`:
  - `onOpenSettings={() => navigateToSystemPage('settings')}`
  - `onOpenHistory={() => navigateToSystemPage('history')}`
  - `onOpenBookmarks={() => navigateToSystemPage('bookmarks')}`

No other files need changes. The `navigateToSystemPage` function and all system page rendering (SettingsTab, HistoryTab, BookmarksTab) already work correctly — they're used by the command palette and NewTab page today.


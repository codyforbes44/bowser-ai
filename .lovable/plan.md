

# Evolve Bowser: Command Palette, Keyboard Shortcuts, and Polished Built-in Pages

## Overview

Add a command palette (Ctrl/Cmd+K), keyboard shortcuts for core actions, improve the existing History/Bookmarks/Settings pages with better empty states and loading skeletons, strip heavy bookmark management from NewTab, and add visual tab-kind indicators.

## Changes

### 1. Command Palette Component
**New file**: `src/bowser/components/CommandPalette.tsx`

A modal overlay triggered by Ctrl/Cmd+K with a search input and filterable action list:
- New Tab, New AI Tab, New Web Tab
- Open History (`bowser://history`), Open Bookmarks (`bowser://bookmarks`), Open Settings (`bowser://settings`)
- Toggle AI/Web Mode, Toggle Real-time Browsing
- Focus Address Bar

Uses a simple custom implementation (no cmdk dependency needed — keep it lightweight). Renders as a centered modal with backdrop blur, keyboard-navigable list with arrow keys + Enter. Closes on Escape or backdrop click.

### 2. Global Keyboard Shortcuts
**Edit**: `src/bowser/BowserApp.tsx`

Add a `useEffect` with a global `keydown` listener for:
- `Ctrl/Cmd+K` → open command palette
- `Ctrl/Cmd+L` → focus address bar (via a ref or custom event)
- `Ctrl/Cmd+T` → new tab
- `Ctrl/Cmd+W` → close current tab (only if >1 tab open, prevent default)
- `Ctrl/Cmd+1-9` → switch to tab N (9 = last tab)
- `Ctrl/Cmd+Shift+T` → new AI tab

Expose an `addressBarRef` callback or dispatch a custom `bowser:focus-omnibar` event that AddressBar listens to.

### 3. Simplify NewTab Page
**Edit**: `src/bowser/components/NewTab.tsx`

- Remove all bookmark folder management UI (create/rename/delete/move)
- Keep only a compact "Favorites" row showing top ~8 bookmarks as small icon tiles (click to navigate)
- Add a "See all bookmarks" link that navigates to `bowser://bookmarks`
- Keep the prompt input, How It Works, I'm Feeling Lucky, grounding toggle, and install prompt
- Result: NewTab is fast and lightweight

### 4. Polish History Page
**Edit**: `src/bowser/components/HistoryTab.tsx`

- Group entries by date (Today, Yesterday, This Week, Older)
- Add a search/filter input at the top
- Better empty state with icon, message, and subtle suggestion text
- Add skeleton loading placeholder (3 shimmer rows) during initial render

### 5. Polish Bookmarks Page
**Edit**: `src/bowser/components/BookmarksTab.tsx`

- This becomes the full bookmark manager (already has folders, but improve layout)
- Add search/filter input
- Better empty state with icon + "Bookmark pages with ⭐ in the address bar" helper text
- Add count badges on folders
- Improve visual hierarchy with section headers

### 6. Polish Settings Page
**Edit**: `src/bowser/components/SettingsTab.tsx`

- Add keyboard shortcuts reference section showing all available shortcuts
- Pass `onClearHistory` prop properly from BowserApp

### 7. Tab Visual Hierarchy
**Edit**: `src/bowser/components/BrowserShell.tsx`

- Add tab-kind icon before tab title: 🌐 for web, ✨ for AI, ⚙️ for settings, 📚 for bookmarks, 🕐 for history, + for new-tab
- Use Material Symbols: `public`, `auto_awesome`, `settings`, `bookmarks`, `history`, `add`
- Slightly different accent color on active tab border based on kind (blue for AI, green for web, gray for system pages)

### 8. Address Bar Focus Support
**Edit**: `src/bowser/components/AddressBar.tsx`

- Listen for custom `bowser:focus-omnibar` event and focus the input ref
- No other changes needed

## Files touched
| File | Action |
|------|--------|
| `src/bowser/components/CommandPalette.tsx` | Create |
| `src/bowser/BowserApp.tsx` | Add shortcuts, command palette state, pass new props |
| `src/bowser/components/NewTab.tsx` | Simplify, remove bookmark management |
| `src/bowser/components/HistoryTab.tsx` | Add grouping, search, better empty state |
| `src/bowser/components/BookmarksTab.tsx` | Add search, count badges, better empty state |
| `src/bowser/components/SettingsTab.tsx` | Add shortcuts reference section |
| `src/bowser/components/BrowserShell.tsx` | Add tab-kind icons |
| `src/bowser/components/AddressBar.tsx` | Add focus event listener |
| `src/index.css` | Command palette styles |


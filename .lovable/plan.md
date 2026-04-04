

# Fix Settings & Dropdown Menus — Production Refactor

## Problems Identified

1. **Desktop "more" menu is empty**: The three-dot menu on desktop (AddressBar.tsx line 590-593) renders a hollow `<div>` with no menu items — clicking it shows a blank box.
2. **Mobile dropdown trapped by stacking context**: The mobile overflow menu sits inside `.mobile-bottom-chrome` which has `backdrop-filter`, creating a new stacking context. The dropdown's `z-index: 100` is relative to that container, not the viewport, so it can render clipped or behind other elements.
3. **Duplicate CSS rules**: `.dropdown-menu` is defined at line 450 and again at line 1215 (glassmorphism override) — the second definition partially overrides background/border but doesn't re-declare positioning, causing inconsistency.
4. **Settings lacks dropdown controls**: All settings use segmented buttons only. For options with 4+ choices (e.g., search engine), a proper dropdown/select would be more usable, especially on mobile.

## Plan

### 1. Fix desktop "more" menu (AddressBar.tsx)
- Populate the empty desktop dropdown (lines 586-594) with useful actions: New Window, Fullscreen, Settings, History, Bookmarks, and the Web/Create mode toggle
- Reuse the same `dropdown-menu-item` pattern as the mobile menu

### 2. Fix mobile dropdown stacking context (index.css + AddressBar.tsx)
- Move the mobile dropdown menu to render via a **React Portal** (`createPortal` to `document.body`) so it escapes the `backdrop-filter` stacking context
- Position it absolutely relative to the trigger button using `getBoundingClientRect()`
- Remove the `.dropdown-menu-mobile` relative positioning hack

### 3. Consolidate duplicate CSS
- Remove the duplicate `.dropdown-menu` block at line 1215
- Merge the glassmorphism properties into the single `.dropdown-menu` definition at line 450

### 4. Add dropdown select for multi-option settings (SettingsTab.tsx)
- Create a new `DropdownSelect` sub-component for settings with 4+ options
- Add a `type: 'dropdown'` variant to the settings schema interface
- Use the search engine setting as the first dropdown (currently 4 segmented buttons that crowd on mobile)
- Style with the existing design system variables, proper focus states, and the glassmorphism theme

### 5. Production hardening
- Add `pointer-events: auto` to dropdown menus to ensure clickability
- Ensure all dropdown items have `min-height: 44px` for touch targets
- Add `aria-haspopup` and `aria-expanded` attributes where missing
- Close dropdowns on scroll and window resize events

## Files Modified
- `src/bowser/components/AddressBar.tsx` — populate desktop menu, portal-render mobile menu
- `src/bowser/components/SettingsTab.tsx` — add `DropdownSelect` component, update search engine setting to use it
- `src/index.css` — consolidate duplicate `.dropdown-menu` rules, fix z-index/stacking


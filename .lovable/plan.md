

## UI Review & Refactor for All Device Types

### Issues Found

1. **Stale "AI" labels in NewTab.tsx** — Mode toggle still shows "AI" instead of "Create"; placeholder says "Ask anything…" instead of "Create anything…"; QuickChip says "Try AI mode"
2. **Inline hover handlers everywhere** — Components use `onMouseEnter`/`onMouseLeave` to set `style.background` and `style.color` directly, instead of CSS classes. This is fragile, doesn't work with touch, and bloats JSX
3. **Insufficient touch targets** — QuickChip buttons, bookmark grid items, and recent-list items are too small for mobile (under 44px min-height)
4. **Hardcoded bookmark grid** — `grid-cols-4` overflows on narrow screens (<360px)
5. **Bowser logo not interactive** — The logo icon in the tab bar has no click handler to navigate home
6. **NewTab vertical padding** — `py-16` wastes space on mobile; content starts too low

### Plan

#### 1. Fix remaining "AI" → "Create" in NewTab.tsx
- Line 88: placeholder `'Ask anything…'` → `'Create anything…'`
- Line 112: title `'Switch to AI mode'` → `'Switch to Create mode'`
- Line 117: label `'AI'` → `'Create'`
- Line 155: label `'Try AI mode'` → `'Try Create mode'`

#### 2. Replace inline hover handlers with CSS utility classes
Add reusable hover classes to `src/index.css`:
```css
.bw-hover-bg:hover { background: var(--bw-bg-hover); }
.bw-hover-text:hover { color: var(--bw-text-secondary); }
.bw-hover-accent:hover { color: var(--bw-accent); }
```
Then strip all `onMouseEnter`/`onMouseLeave` handlers from NewTab.tsx and replace with these classes. This removes ~30 lines of repetitive JS and makes hover behavior CSS-native (no-op on touch devices).

#### 3. Improve touch targets and mobile responsiveness in NewTab.tsx
- QuickChip: add `min-h-[44px]` and `touch-action: manipulation`
- Bookmark grid: change to `grid-cols-4 sm:grid-cols-4` with fallback `grid-cols-3` below 360px via CSS
- Recent/history list items: ensure `min-h-[44px]` with `py-2.5` instead of `py-2`
- Reduce `py-16` to `py-8 md:py-16` for mobile breathing room
- Add bottom padding to account for mobile bottom chrome

#### 4. Make Bowser logo clickable (BrowserShell.tsx)
Wrap the `<img>` in a `<button>` with `onClick={onHome}` and proper `aria-label="Home"`. Apply to both desktop and mobile tab bar instances.

#### 5. Add responsive bookmark grid CSS rule
```css
@media (max-width: 359px) {
  .newtab-bookmark-grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Files to Edit
- `src/bowser/components/NewTab.tsx` — Fix labels, replace inline hover handlers with CSS classes, improve touch targets, responsive padding
- `src/bowser/components/BrowserShell.tsx` — Make logo clickable
- `src/index.css` — Add hover utility classes and responsive bookmark grid rule


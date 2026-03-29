

## Fix: Missing Material Symbols Icons + Refactor

### Problem
The screenshot shows all icons rendering as raw text ("public", "arrow_back", "arrow_forward", "refresh", "star_border", "language", "more_vert", etc.) throughout the entire UI — tab bar, address bar, and all controls. This is because `index.html` is missing the Google Material Symbols Outlined font link.

### Plan

**1. Add Material Symbols font to `index.html`**
Add the Google Fonts stylesheet link for Material Symbols Outlined in the `<head>`:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
```
This single fix resolves all broken icons across every component (BrowserShell, AddressBar, NewTab, AiSidePanel, OnboardingModal, SettingsTab, BookmarksTab, HistoryTab, CommandPalette, InstallPrompt).

**2. Add base CSS rule for the icon font**
Add to `src/index.css` a base rule ensuring consistent icon rendering:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
}
```

**3. Minor refactor: normalize icon sizing**
Several components use inline `style={{ fontSize: '14px' }}` or `'16px'` etc. on every icon instance. Add utility classes to reduce repetition:
```css
.icon-sm { font-size: 14px !important; }
.icon-md { font-size: 16px !important; }
.icon-lg { font-size: 18px !important; }
.icon-xl { font-size: 24px !important; }
```

These are optional helpers — the critical fix is step 1.

### Files Changed
- `index.html` — add font link
- `src/index.css` — add icon font base styles


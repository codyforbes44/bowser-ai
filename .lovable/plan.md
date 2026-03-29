

## Dependency Audit & Settings Verification

### Current State

Bowser is a self-contained browser app living in `src/bowser/`. It uses **zero** shadcn/ui components — none of the `src/components/ui/*` files are imported by any Bowser code. The entire UI is hand-built with CSS custom properties and Material Symbols icons.

The app shell (`App.tsx`) wraps BowserApp with `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, and `BrowserRouter` — none of which Bowser actually uses.

### Dependencies Analysis

| Dependency | Used by Bowser? | Used elsewhere? | Verdict |
|---|---|---|---|
| `react`, `react-dom` | Yes | Core | **Keep** |
| `react-router-dom` | Only in App.tsx routing shell | Routes to Index which renders BowserApp | **Keep** (minimal, handles 404) |
| `@google/genai` | Yes — AI generation | Core feature | **Keep** |
| `vite-plugin-pwa` | Yes — PWA/install prompt | Build config | **Keep** |
| `tailwind-merge`, `clsx` | Used in `src/lib/utils.ts` `cn()` | Not used by Bowser | **Can remove** |
| `class-variance-authority` | Only in unused ui/ components | Not used by Bowser | **Can remove** |
| `@tanstack/react-query` | Only in App.tsx wrapper | BowserApp never uses queries | **Can remove** |
| `sonner` | Only in App.tsx via unused Sonner toaster | BowserApp never calls toast() | **Can remove** |
| `cmdk` | Only in unused `src/components/ui/command.tsx` | Bowser has its own CommandPalette | **Can remove** |
| `date-fns` | Only in unused ui/calendar | Not used by Bowser | **Can remove** |
| `lucide-react` | Only in unused ui/ components | Bowser uses Material Symbols | **Can remove** |
| `recharts` | Only in unused ui/chart | Not used | **Can remove** |
| `embla-carousel-react` | Only in unused ui/carousel | Not used | **Can remove** |
| `react-day-picker` | Only in unused ui/calendar | Not used | **Can remove** |
| `input-otp` | Only in unused ui/input-otp | Not used | **Can remove** |
| `next-themes` | Not imported anywhere | Dead dep | **Can remove** |
| `react-hook-form`, `@hookform/resolvers`, `zod` | Only in unused ui/form | Not used | **Can remove** |
| `react-resizable-panels` | Only in unused ui/resizable | Not used | **Can remove** |
| `vaul` | Only in unused ui/drawer | Not used | **Can remove** |
| `tailwindcss-animate` | Tailwind plugin, used in config | Some animations may reference it | **Keep** (safe) |
| All 20+ `@radix-ui/*` packages | Only in unused ui/ components | Not used by Bowser | **Can remove** |

**Summary**: ~30 dependencies can be safely removed. Only `react`, `react-dom`, `react-router-dom`, `@google/genai`, `vite-plugin-pwa`, `tailwind-merge`, `clsx`, and build tooling are actually needed.

### Settings Functionality Verification

All 5 settings sections use localStorage via the `storage.ts` utility (with try/catch guards):

| Setting | Storage Key | Read Function | Write Function | Works? |
|---|---|---|---|---|
| **Theme** (dark/light/system) | `bowser-theme` | `getEffectiveTheme()` | `setStorageItem('theme', t)` + `applyBowserTheme()` | ✅ Sets `data-bowser-theme` attribute on `<html>` |
| **Font size** (small/medium/large) | `bowser-font-size` | `getFontSize()` | `setFontSize()` → `applyFontScale()` | ✅ Sets `--bw-font-scale` CSS property |
| **Search engine** | `bowser-search-engine` | `getSearchEngine()` | `setSearchEngineSetting()` | ✅ Used by `useOmnibox` for web searches |
| **Tab limit** (5/10/20/∞) | `bowser-tab-limit` | `getTabLimit()` | `setTabLimit()` | ✅ Checked in `handleNewTab()` |
| **Clear history** | N/A | N/A | Calls `onClearHistory` prop → `clearHistory()` | ✅ Clears `bowser-history` |
| **Clear bookmarks** | N/A | N/A | Calls `onClearBookmarks` prop → removes each bookmark | ✅ Clears `bowser-bookmarks` |

All settings persist correctly and work in-memory if localStorage is unavailable.

### Proposed Plan

**Phase 1: Clean up App.tsx** — Remove `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner` wrappers since BowserApp doesn't use them. Simplify to just `BrowserRouter` + `Routes`.

**Phase 2: Remove unused UI component files** — Delete all `src/components/ui/*` files (40+ files), `src/components/NavLink.tsx`, `src/hooks/use-toast.ts`, `src/hooks/use-mobile.tsx`, and `src/lib/utils.ts` since none are imported by Bowser.

**Phase 3: Remove unused dependencies from package.json** — Remove ~30 packages: all `@radix-ui/*`, `lucide-react`, `recharts`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `zod`, `react-resizable-panels`, `vaul`, `cmdk`, `date-fns`, `sonner`, `@tanstack/react-query`, `class-variance-authority`. Keep `clsx` and `tailwind-merge` only if needed — they can go too since Bowser doesn't use `cn()`.

**Phase 4: Verify build** — Run lint/typecheck/build to confirm zero errors after cleanup.

### Files Changed
- `src/App.tsx` — simplify wrappers
- `package.json` — remove ~30 unused dependencies
- Delete ~45 files in `src/components/ui/`, `src/components/NavLink.tsx`, `src/hooks/use-toast.ts`, `src/hooks/use-mobile.tsx`, `src/lib/utils.ts`


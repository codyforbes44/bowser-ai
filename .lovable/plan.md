

## Make Bowser Fully Standalone

### Goal
Ensure Bowser works as an independent, installable application on all device types (phones, tablets, desktops) without any dependency on the Lovable preview environment.

### Current Issues

1. **Unused dependencies still in package.json** — ~30 packages (all @radix-ui/*, lucide-react, recharts, cmdk, zod, etc.) were approved for removal but the previous execution was cancelled mid-way. They need to be stripped.

2. **Unused CSS boilerplate** — `src/index.css` contains shadcn/ui CSS variables (lines 14-84: `:root` with `--background`, `--foreground`, `.dark` block, `@apply border-border`, etc.) that are no longer used by any component. `src/App.css` is entirely unused Vite boilerplate.

3. **Unnecessary routing layer** — `react-router-dom` wraps a single route (`/` → BowserApp). Since Bowser handles its own internal navigation (tabs, system pages), the router adds no value. Can be removed entirely, rendering BowserApp directly.

4. **PWA manifest hardening** — Current manifest is functional but missing `scope`, `categories`, and `screenshots` fields that improve installability on mobile devices. Icons should specify separate `purpose: "any"` and `purpose: "maskable"` entries (combining them in one entry is deprecated).

5. **Safe area coverage** — Top inset is handled (`padding-top: env(safe-area-inset-top)`), bottom is handled on mobile chrome. Left/right safe areas (for landscape phones with notches) are not covered.

6. **Viewport meta** — Already has `viewport-fit=cover` which is correct for standalone apps.

7. **Service worker guards** — `main.tsx` correctly unregisters SW in preview/iframe contexts. For standalone mode, the SW registers normally via vite-plugin-pwa's `autoUpdate`. This is correct.

### Plan

**Phase 1: Strip dead code and dependencies**
- Delete `src/App.css` (unused Vite boilerplate)
- Remove shadcn CSS variables from `src/index.css` (lines 14-84) — the `:root`/`.dark` block and the `@apply border-border` rule. Keep only Bowser's `--bw-*` design system.
- Remove `react-router-dom` from dependencies. Simplify `App.tsx` to render `<BowserApp />` directly (no `BrowserRouter`/`Routes`). Delete `src/pages/Index.tsx` and `src/pages/NotFound.tsx` — Bowser handles its own 404/empty states internally.
- Remove all unused dependencies from `package.json`: all `@radix-ui/*`, `lucide-react`, `recharts`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `zod`, `react-resizable-panels`, `vaul`, `cmdk`, `date-fns`, `sonner`, `@tanstack/react-query`, `class-variance-authority`, `clsx`, `tailwind-merge`.

**Phase 2: PWA manifest improvements**
- Split icon entries: separate `"purpose": "any"` and `"purpose": "maskable"` entries for each size
- Add `scope: "/"` and `categories: ["productivity", "utilities"]`
- Add `id: "/"` for stable app identity across updates
- Add `display_override: ["standalone", "minimal-ui"]` for broader browser support

**Phase 3: Safe area and standalone polish**
- Add left/right safe area padding to `.browser-shell` and `.mobile-bottom-chrome` for landscape notch devices
- Add `<meta name="mobile-web-app-capable" content="yes">` to `index.html` for Android standalone
- Ensure `manifest.webmanifest` link is in `index.html` (vite-plugin-pwa handles this automatically, but verify)

**Phase 4: Rename package and clean metadata**
- Rename `package.json` `name` from `"vite_react_shadcn_ts"` to `"bowser"`
- Update `version` to `"1.0.0-rc.1"`

### Files Changed
- `package.json` — remove ~30 deps, rename, version bump
- `src/App.tsx` — simplify to direct render
- `src/main.tsx` — remove App.css import if present
- `src/index.css` — remove shadcn boilerplate CSS variables
- `vite.config.ts` — improve PWA manifest
- `index.html` — add Android standalone meta tag
- Delete: `src/App.css`, `src/pages/Index.tsx`, `src/pages/NotFound.tsx`


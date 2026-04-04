

# Fix Create Mode — Oversized SVG Issue

## Problem
The screenshot shows the AI generating massive decorative SVG shapes (blue arches) that fill the entire viewport, completely breaking the page layout. The model is interpreting the "use inline SVGs" instruction too broadly — creating large illustrative SVGs instead of small icon SVGs.

## Root Cause
The system prompt in `generate-page/index.ts` instructs the model to use inline SVGs for icons but has no constraint on SVG size or usage scope. The model generates large SVG illustrations as hero/decorative elements.

## Fix

### 1. Update system prompt (`supabase/functions/generate-page/index.ts`)

Add explicit rules to the STRICT STYLE RULES section:

- **SVGs are for icons only** — max size `w-6 h-6` (24px). Never use SVGs as hero graphics, decorative illustrations, logos, or background art.
- **For decorative/hero visuals** — use Unsplash photos or Tailwind gradient backgrounds. Never generate large custom SVG artwork.
- **All SVG elements must have explicit `width` and `height` attributes** or Tailwind size classes (`w-5 h-5`, `w-6 h-6`).
- Add a negative example: "NEVER create large decorative SVG shapes, arches, blobs, or abstract art as SVG elements."

### 2. Add SVG size safety net in Sandbox (`src/bowser/components/Sandbox.tsx`)

Add a CSS rule in the shell's `<style>` block to cap any unconstrained SVGs:
```css
svg:not([class*="w-"]):not([width]) { max-width: 48px; max-height: 48px; }
```

This prevents runaway SVGs from breaking the layout even if the AI ignores the prompt rules.

### 3. Redeploy the edge function

Deploy the updated `generate-page` function.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/generate-page/index.ts` | Add SVG size constraints to system prompt |
| `src/bowser/components/Sandbox.tsx` | Add CSS safety cap for unconstrained SVGs |


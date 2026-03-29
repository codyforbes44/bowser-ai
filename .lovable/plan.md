

## Generate Bowser PWA Icons

### What
Create proper branded PWA icons (`pwa-192x192.png` and `pwa-512x512.png`) featuring the Bowser logo — a stylized "B" on the app's indigo accent background (`#6366f1`), matching the dark theme design system.

### How

**Generate icons via script** using HTML Canvas (Node.js `canvas` package or inline SVG-to-PNG conversion):

- **Background**: Rounded-corner square filled with `#6366f1` (the `--bw-accent` color)
- **Logo mark**: A bold, geometric white "B" letterform centered on the icon — clean, modern, matching the app's minimal aesthetic
- **Two sizes**: 192x192 and 512x512, written to `public/pwa-192x192.png` and `public/pwa-512x512.png` (replacing the current placeholder files)

Also update `public/favicon.ico` reference in `index.html` to point to the new `pwa-192x192.png` for consistency (this is already done from a previous edit).

### Technical Details

- Use a Python script with `Pillow` to draw the icon: rounded-rect background + bold sans-serif "B" character
- Corner radius: ~20% of icon size (38px for 192, 102px for 512) for modern app icon feel
- The "B" will be rendered in white (`#FFFFFF`) using a bold font, sized to ~60% of the icon dimension
- Both files overwrite the existing placeholders in `public/`

### Files Changed
- `public/pwa-192x192.png` — new branded icon
- `public/pwa-512x512.png` — new branded icon


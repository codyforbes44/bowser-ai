

# Make Bowser a Best-in-Class Installable PWA

## Overview
Add PWA support so Bowser can be installed to the home screen on any device, with proper branding, icons, theme colors, and offline awareness. Per Lovable guidelines, we'll use `vite-plugin-pwa` with safeguards to avoid preview/iframe issues.

**Important**: PWA install and offline features will only work on the **published** site, not in the Lovable editor preview.

## Steps

### 1. Install `vite-plugin-pwa`
Add `vite-plugin-pwa` as a dependency.

### 2. Create PWA icons
Generate multiple icon sizes in `public/`:
- `pwa-192x192.png` and `pwa-512x512.png` (maskable + any)
- Use a Bowser-themed icon (browser compass/paw icon in the app's blue accent color)

### 3. Update `vite.config.ts`
Add `VitePWA` plugin with:
- `registerType: "autoUpdate"`
- `devOptions: { enabled: false }` (no SW in dev)
- `workbox.navigateFallbackDenylist: [/^\/~oauth/]`
- Full `manifest` object: name "Bowser", short_name "Bowser", theme_color `#1a1a2e`, background_color `#1a1a2e`, display `standalone`, icons array

### 4. Add iframe/preview guard in `src/main.tsx`
Prevent service worker registration and unregister existing SWs when running inside an iframe or on a Lovable preview domain.

### 5. Update `index.html`
- Set `<title>` to "Bowser"
- Add `<meta name="theme-color" content="#1a1a2e">`
- Add `<link rel="apple-touch-icon" href="/pwa-192x192.png">`
- Add `<meta name="apple-mobile-web-app-capable" content="yes">`
- Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`

### 6. Create an install prompt component
Build a small `InstallPrompt` component that:
- Listens for the `beforeinstallprompt` event
- Shows a styled banner/button inviting the user to install Bowser
- Dismisses after install or user decline
- Integrates into the New Tab page or as a subtle bar

## Technical notes
- No offline-first caching of external sites (the browser loads live URLs in iframes)
- Precache only the app shell (HTML, JS, CSS, icons)
- The manifest `start_url` will be `/`
- `display: standalone` removes browser chrome for a native feel


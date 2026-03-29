

# Remove Fullscreen Setting Toggle — Always Default to Fullscreen

The user wants to simplify: remove the settings toggle and always auto-fullscreen on first interaction.

## Changes

### 1. `src/bowser/BowserApp.tsx`
- Remove the `getAutoFullscreen()` check on line 57 — always attempt fullscreen (still skip in iframes)
- Remove `getAutoFullscreen` from the import on line 17

### 2. `src/bowser/components/SettingsTab.tsx`
- Remove the "Open in fullscreen" toggle row (the `SettingsRow` with `autoFullscreen`)
- Remove the `getAutoFullscreen`, `setAutoFullscreen` imports and related state/handler

### 3. `src/bowser/hooks/useBowserSettings.ts`
- Remove `getAutoFullscreen()` and `setAutoFullscreen()` functions

### Result
Auto-fullscreen always triggers on first user gesture (click/keydown), skipped only in iframes. No user-facing toggle — it just works.


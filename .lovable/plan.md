

# Rename Remaining Flash-Lite References and Clean Up AddressBar Storage

## What's already done
The codebase is already well-structured: tab kinds are typed, navigation parsing is in `utils/navigation.ts`, bookmarks and history are in `store/` modules, and the storage adapter in `utils/storage.ts` already handles migration from `flash-lite-*` to `bowser-*` keys.

## What still needs to change

There are exactly **3 files** with leftover `flash-lite` references:

### 1. `src/bowser/components/AddressBar.tsx`
The address bar uses raw `localStorage` calls with `flash-lite-current-input` and `flash-lite-history` keys instead of the storage adapter. Refactor to use `getStorageItem` / `setStorageItem` from `utils/storage.ts`, which will automatically migrate old keys and use the `bowser-` prefix.

### 2. `src/bowser/components/Sandbox.tsx`
- Rename `id="flash-lite-api"` to `id="bowser-api"` in the sandbox shell HTML
- Rename `data-flash-lite-font` attribute to `data-bowser-font` (used for injected Google Font links)

These are internal iframe attributes with no external dependencies — safe to rename directly.

### 3. `src/bowser/utils/storage.ts`
Already correct — the `OLD_STORAGE_PREFIX = 'flash-lite-'` stays as-is since it powers the migration fallback. No change needed.

## Summary of changes

| File | Change |
|------|--------|
| `AddressBar.tsx` | Replace 6 raw `localStorage` calls with `getStorageItem`/`setStorageItem` using keys `'current-input'` and `'search-history'` |
| `Sandbox.tsx` | Rename `flash-lite-api` → `bowser-api`, `data-flash-lite-font` → `data-bowser-font` (3 occurrences) |

No behavioral changes. All existing features preserved. Build-safe string replacements only.


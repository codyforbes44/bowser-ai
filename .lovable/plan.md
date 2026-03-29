

## Rename "AI" to "Create" and Reverse Toggle Order

### What Changes
The mode toggle currently reads **AI ⟵toggle⟶ Web** (left-to-right). Change to **Web ⟵toggle⟶ Create** — swapping label positions and reversing the toggle direction so "Web" is left/off and "Create" is right/on.

### Semantics After Change
- Toggle **off** (thumb left) = Web mode (`isBrowserMode: true`)
- Toggle **on** (thumb right) = Create mode (`isBrowserMode: false`, the AI/generate mode)

This inverts the current toggle direction: `isBrowserMode` currently maps to "active/on" — after the change, `!isBrowserMode` maps to "active/on".

### Files to Edit

**`src/bowser/components/AddressBar.tsx`**
1. **Desktop toggle** (lines 438-458): Swap label positions — "Web" on left, "Create" on right. Flip `active` class and thumb transform to use `!isBrowserMode`. Update highlight colors accordingly.
2. **Mobile dropdown** (lines 390-404): Change `'AI mode'` text to `'Create mode'`. Flip toggle active state.
3. **Tooltip/aria** (lines 445-446): Update "AI" references to "Create".
4. **Placeholder text** (line 265): Change `'Ask anything…'` to `'Create anything…'` for Create mode.

**`src/bowser/BowserApp.tsx`**
- Line 241: Update command palette label from `'Toggle AI / Web Mode'` to `'Toggle Create / Web Mode'`.


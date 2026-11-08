# Adding the assets to your site

1. Copy the `tiles/`, `transparent-png/`, and `svg/` folders into your public assets directory (for example `public/social-logos/`).
2. Prefer the SVG file when one is available. SVG files scale sharply and can be styled with CSS if you adjust their `fill` value.
3. For brands without an included SVG, use the matching `transparent-png/` file; use the `tiles/` version when the transparent extraction loses detail.
4. Use `manifest.json` or `manifest.csv` to map IDs and display names.

Example (React):

```jsx
<img src="/social-logos/svg/discord.svg" alt="Discord" width={28} height={28} />
<img src="/social-logos/transparent-png/venmo.png" alt="Venmo" width={28} height={28} />
```

For production, verify the ambiguous dark N-mark in row 2, column 12 before naming it, and replace screenshot-derived PNGs with official brand downloads where possible.

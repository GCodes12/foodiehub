# ZAYORA images

Drop image files into these folders and the app uses them automatically — no code change needed
(`src/utils/images.ts`). Formats: `.webp` (preferred), `.jpg`, `.png`, `.avif`. Anything missing shows ZAYORA's
built-in illustration of that dish (drawn in code: `src/components/common/DishArt.tsx`, contents per dish in
`src/utils/dishArt.ts`).

| Folder | File name | Used for |
|---|---|---|
| `brand/` | `zayora-logo.webp`, `zayora-wordmark.webp` | Logo with and without the tagline (on burgundy) |
| `hero/` | `hero.webp` | Home-page hero. Recommended: a dum biryani in a handi, portrait, ≥ 900 × 1000 px |
| `dishes/` | `<imageKey>.webp` | Dish photos. `imageKey` comes from the menu API, e.g. `classic-chicken-dum-biryani.webp` |
| `categories/` | `<category-code>.webp` | Category tiles, e.g. `chicken-biryani.webp`, `starters.webp` |

Dish keys (from the Restaurant Service seed): classic-veg-dum-biryani, hyderabadi-veg-biryani, mushroom-biryani,
paneer-tikka-biryani, paneer-butter-masala-biryani, classic-egg-biryani, double-egg-biryani, egg-masala-biryani,
classic-chicken-dum-biryani, hyderabadi-chicken-biryani, chicken-65-biryani, chicken-tikka-biryani,
boneless-chicken-biryani, classic-mutton-dum-biryani, hyderabadi-mutton-biryani, special-mutton-biryani, chicken-65,
chicken-tikka, paneer-tikka, seekh-kebab, crispy-corn, paneer-butter-masala, dal-makhani, chicken-curry,
mutton-masala, boondi-raita, cucumber-raita, mirchi-salan, papad, onion-salad, gulab-jamun, rasmalai,
double-ka-meetha, phirni, sweet-lassi, mango-lassi, masala-chaas, soft-drink, single-biryani-meal,
biryani-starter-combo, couple-combo, family-biryani-pack.

Category codes: veg-biryani, paneer-biryani, egg-biryani, chicken-biryani, mutton-biryani, starters, curries,
accompaniments, desserts, beverages, combos.

Recommended size for dish photos: 1200 × 900 px (4:3), compressed WebP under ~200 KB.
The current `hero/hero.webp` is a temporary crop of an earlier image; replace it with the handi photo.

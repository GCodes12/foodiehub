// Image lookup by file name. Drop files into these folders and they are used automatically (no code change):
//   src/assets/brand/       zayora-logo.webp (with tagline), zayora-wordmark.webp
//   src/assets/hero/        hero.(webp|jpg|png)                     — home page hero
//   src/assets/dishes/      <imageKey>.(webp|jpg|png)               — imageKey comes from the menu API
//   src/assets/categories/  <category-code-in-kebab-case>.(webp|...) — e.g. chicken-biryani.webp
// Anything missing falls back to placeholder artwork. See src/assets/README.md.

let files: Record<string, string> = {};
try {
  // Vite replaces this call at build time. Outside Vite (unit tests) it throws, and no images are used.
  files = import.meta.glob('../assets/{brand,hero,dishes,categories}/*.{webp,jpg,jpeg,png,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>;
} catch {
  files = {};
}

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const match = /assets\/([a-z]+)\/([^/]+)\.[a-z]+$/i.exec(path);
  if (match) {
    byName.set(`${match[1]}/${match[2].toLowerCase()}`, url);
  }
}

function find(folder: string, name: string | null | undefined): string | null {
  return name ? byName.get(`${folder}/${name.toLowerCase()}`) ?? null : null;
}

export const images = {
  logo: (): string | null => find('brand', 'zayora-logo'),
  wordmark: (): string | null => find('brand', 'zayora-wordmark'),
  hero: (): string | null => find('hero', 'hero'),
  dish: (imageKey: string | null): string | null => find('dishes', imageKey),
  category: (code: string): string | null => find('categories', code.toLowerCase().replace(/_/g, '-')),
};

import type { Diet, MenuItem } from '../types/api.ts';
import { hasMessage, t } from './i18n.ts';

// Menu browsing logic: category order and names, search, filters, sorting, and the home-page selections.
// Categories are codes from the Restaurant Service (DEC-014); names come from src/messages/en.json.

export const CATEGORY_ORDER = [
  'VEG_BIRYANI', 'PANEER_BIRYANI', 'EGG_BIRYANI', 'CHICKEN_BIRYANI', 'MUTTON_BIRYANI',
  'STARTERS', 'CURRIES', 'ACCOMPANIMENTS', 'DESSERTS', 'BEVERAGES', 'COMBOS',
] as const;

export type DietFilter = 'ALL' | Diet;
export type SortMode = 'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC';

/** Label filters used by the home-page "View all" links. "SIGNATURE" = chef's specials and bestsellers among biryanis. */
export type LabelFilter = 'BESTSELLER' | 'CHEF_SPECIAL' | 'SIGNATURE';
export const LABEL_FILTERS: readonly LabelFilter[] = ['BESTSELLER', 'CHEF_SPECIAL', 'SIGNATURE'];

/**
 * Which menu the customer is looking at. VEG = vegetarian dishes only. NON_VEG = chicken, mutton and egg dishes plus the
 * sides, desserts and drinks that go with them (all vegetarian), so a non-veg order can still include raita or a lassi.
 */
export type MenuView = 'ALL' | 'VEG' | 'NON_VEG';
export const MENU_VIEWS: readonly MenuView[] = ['ALL', 'VEG', 'NON_VEG'];

/** Categories shown in both the veg and the non-veg menu. */
export const PAIRING_CATEGORIES: ReadonlySet<string> = new Set(['ACCOMPANIMENTS', 'DESSERTS', 'BEVERAGES']);

export interface MenuFilters {
  query: string;
  category: string | null;
  diet: DietFilter;
  label?: LabelFilter | null;
  view?: MenuView;
}

export const NO_FILTERS: MenuFilters = { query: '', category: null, diet: 'ALL', label: null, view: 'ALL' };

export function matchesView(item: MenuItem, view: MenuView | undefined): boolean {
  switch (view) {
    case 'VEG':
      return item.diet === 'VEG';
    case 'NON_VEG':
      return item.diet === 'NON_VEG' || item.diet === 'EGG' || (item.diet === 'VEG' && PAIRING_CATEGORIES.has(item.category));
    default:
      return true;
  }
}

/** The dishes in a menu view (unfiltered otherwise). */
export function itemsInView(items: MenuItem[], view: MenuView | undefined): MenuItem[] {
  return items.filter((item) => matchesView(item, view));
}

/** Count of the view's own dishes: veg dishes for VEG, non-veg and egg dishes for NON_VEG (pairings not counted). */
export function viewDishCount(items: MenuItem[], view: MenuView): number {
  if (view === 'ALL') {
    return items.length;
  }
  return items.filter((item) => (view === 'VEG' ? item.diet === 'VEG' : item.diet === 'NON_VEG' || item.diet === 'EGG')).length;
}

/** Up to `count` dishes that represent a view (its bestsellers and chef's specials first), for the menu cards' artwork. */
export function viewHighlights(items: MenuItem[], view: MenuView, count = 3): MenuItem[] {
  const own = items.filter((item) => matchesView(item, view) && !(view !== 'ALL' && PAIRING_CATEGORIES.has(item.category)));
  const ranked = [...own].sort((a, b) => Number(b.bestseller || b.chefSpecial) - Number(a.bestseller || a.chefSpecial));
  const picked: MenuItem[] = [];
  const seen = new Set<string>();
  for (const item of ranked) { // one per category, so the three pictures differ
    if (!seen.has(item.category)) {
      seen.add(item.category);
      picked.push(item);
    }
    if (picked.length === count) {
      break;
    }
  }
  return picked;
}

export function matchesLabel(item: MenuItem, label: LabelFilter | null | undefined): boolean {
  switch (label) {
    case 'BESTSELLER':
      return item.bestseller;
    case 'CHEF_SPECIAL':
      return item.chefSpecial;
    case 'SIGNATURE':
      return isBiryani(item.category) && (item.bestseller || item.chefSpecial);
    default:
      return true;
  }
}

/** False when the menu carries no diet information (for example an older Restaurant Service): hide the diet filter. */
export function hasDietData(items: MenuItem[]): boolean {
  return items.some((item) => item.diet !== null);
}

export function isBiryani(category: string): boolean {
  return category.endsWith('_BIRYANI');
}

export function categoryName(code: string): string {
  if (hasMessage(`categories.${code}.name`)) {
    return t(`categories.${code}.name`);
  }
  return code.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function categoryBlurb(code: string): string | null {
  return hasMessage(`categories.${code}.blurb`) ? t(`categories.${code}.blurb`) : null;
}

/** Categories present in the menu: known ones in menu order, any new ones after them. */
export function categoriesOf(items: MenuItem[]): string[] {
  const present = new Set(items.map((item) => item.category));
  const known = CATEGORY_ORDER.filter((code) => present.has(code));
  const unknown = [...present].filter((code) => !(CATEGORY_ORDER as readonly string[]).includes(code))
    .sort((a, b) => a.localeCompare(b, 'en'));
  return [...known, ...unknown];
}

/** Every word of the query must start a word of the dish name, description or category ("lassi" ≠ "cLASSIc"). */
export function matchesQuery(item: MenuItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const words = `${item.name} ${item.description ?? ''} ${categoryName(item.category)}`.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}

export function filterItems(items: MenuItem[], filters: MenuFilters): MenuItem[] {
  return items.filter((item) =>
    matchesQuery(item, filters.query)
    && (filters.category === null || item.category === filters.category)
    && (filters.diet === 'ALL' || item.diet === filters.diet)
    && matchesView(item, filters.view)
    && matchesLabel(item, filters.label));
}

/** RECOMMENDED keeps the restaurant's own order. Sorting never moves sold-out dishes ahead of available ones. */
export function sortItems(items: MenuItem[], mode: SortMode): MenuItem[] {
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    if (a.item.available !== b.item.available) {
      return a.item.available ? -1 : 1;
    }
    if (mode === 'PRICE_ASC' && a.item.price !== b.item.price) {
      return a.item.price - b.item.price;
    }
    if (mode === 'PRICE_DESC' && a.item.price !== b.item.price) {
      return b.item.price - a.item.price;
    }
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.item);
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

/** Groups items by category in menu order, keeping each item's order within its group. */
export function groupByCategory(items: MenuItem[]): MenuSection[] {
  return categoriesOf(items).map((category) => ({ category, items: items.filter((item) => item.category === category) }));
}

const MAINS = new Set(['VEG_BIRYANI', 'PANEER_BIRYANI', 'EGG_BIRYANI', 'CHICKEN_BIRYANI', 'MUTTON_BIRYANI', 'STARTERS', 'CURRIES']);

export interface HomeSelections {
  signature: MenuItem[];
  bestsellers: MenuItem[];
  vegFavourites: MenuItem[];
  nonVegFavourites: MenuItem[];
  startersAndSides: MenuItem[];
  combos: MenuItem[];
}

/** Home-page rows, all derived from the restaurant's real menu and labels (nothing invented). */
export function homeSelections(items: MenuItem[], perRow = 8): HomeSelections {
  const available = sortItems(items, 'RECOMMENDED');
  const pick = (predicate: (item: MenuItem) => boolean) => available.filter(predicate).slice(0, perRow);
  return {
    signature: pick((i) => matchesLabel(i, 'SIGNATURE')),
    bestsellers: pick((i) => i.bestseller),
    vegFavourites: pick((i) => i.diet === 'VEG' && MAINS.has(i.category)),
    nonVegFavourites: pick((i) => i.diet === 'NON_VEG' && MAINS.has(i.category)),
    startersAndSides: pick((i) => i.category === 'STARTERS' || i.category === 'ACCOMPANIMENTS'),
    combos: pick((i) => i.category === 'COMBOS'),
  };
}

export function lowestPrice(items: MenuItem[], category: string): number | null {
  const prices = items.filter((i) => i.category === category).map((i) => i.price);
  return prices.length ? Math.min(...prices) : null;
}

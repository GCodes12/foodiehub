import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { menuItem, render, text } from '../../test/render.tsx';
import { NO_FILTERS } from '../../utils/menu.ts';
import type { MenuFilters, SortMode } from '../../utils/menu.ts';
import { MenuBrowser } from './MenuBrowser.tsx';

const ITEMS = [
  menuItem('veg', { name: 'Classic Veg Dum Biryani', category: 'VEG_BIRYANI', price: 229 }),
  menuItem('chicken', { name: 'Classic Chicken Dum Biryani', category: 'CHICKEN_BIRYANI', price: 299, diet: 'NON_VEG' }),
  menuItem('c65', { name: 'Chicken 65', category: 'STARTERS', price: 249, diet: 'NON_VEG' }),
  menuItem('lassi', { name: 'Mango Lassi', category: 'BEVERAGES', price: 99 }),
];

function show(filters: MenuFilters = NO_FILTERS, sort: SortMode = 'RECOMMENDED') {
  return render(<MenuBrowser items={ITEMS} restaurantId="r1" filters={filters} sort={sort}
    onFilters={() => {}} onSort={() => {}} onOpen={() => {}} />);
}

describe('MenuBrowser', () => {
  it('renders every dish under its category heading, in menu order', () => {
    const full = text(show());
    assert.match(full, /4 dishes/);
    const page = full.slice(full.lastIndexOf('4 dishes')); // the result count: after the menu switch and the toolbar's chips
    const order = ['Veg Biryani', 'Classic Veg Dum Biryani', 'Chicken Biryani', 'Classic Chicken Dum Biryani', 'Starters', 'Chicken 65', 'Beverages', 'Mango Lassi']
      .map((s) => page.indexOf(s));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.ok(order.every((i) => i >= 0));
  });

  it('shows one category chip per category, with the selected one pressed', () => {
    const html = show({ ...NO_FILTERS, category: 'STARTERS' });
    assert.match(html, /aria-pressed="true"[^>]*>Starters</);
    assert.match(html, /aria-pressed="false"[^>]*>All</);
    assert.match(text(html), /1 dish/);
    assert.doesNotMatch(text(html), /Mango Lassi/);
  });

  it('applies search and diet filters', () => {
    assert.match(text(show({ ...NO_FILTERS, query: 'lassi' })), /1 dish.*Mango Lassi/);
    const veg = text(show({ ...NO_FILTERS, diet: 'VEG' }));
    assert.match(veg, /Classic Veg Dum Biryani/);
    assert.doesNotMatch(veg, /Chicken 65/);
  });

  it('shows a clear-filters state when nothing matches', () => {
    const page = text(show({ ...NO_FILTERS, query: 'pizza' }));
    assert.match(page, /No dishes match your filters/);
    assert.match(page, /Clear filters/);
  });

  it('lists dishes by price when sorted, without category headings', () => {
    const page = text(show(NO_FILTERS, 'PRICE_ASC'));
    assert.ok(page.indexOf('Mango Lassi') < page.indexOf('Chicken 65'));
    assert.ok(page.indexOf('Chicken 65') < page.indexOf('Classic Chicken Dum Biryani'));
    assert.doesNotMatch(show(NO_FILTERS, 'PRICE_ASC'), /menu-section-title/);
  });

  it('hides the veg / non-veg menu switch when the menu has no diet data, instead of offering menus that match nothing', () => {
    const noDiet = ITEMS.map((i) => ({ ...i, diet: null }));
    const html = render(<MenuBrowser items={noDiet} restaurantId="r1" filters={NO_FILTERS} sort="RECOMMENDED"
      onFilters={() => {}} onSort={() => {}} onOpen={() => {}} />);
    assert.doesNotMatch(html, /aria-label="Choose a menu"/);
    assert.match(show(), /aria-label="Choose a menu"/);
  });

  it('offers full, veg and non-veg menus with their dish counts, the current one pressed', () => {
    const html = show({ ...NO_FILTERS, view: 'VEG' });
    assert.match(text(html), /Full menu 4 dishes/);
    assert.match(text(html), /Veg menu 2 vegetarian dishes/);
    assert.match(text(html), /Non-veg menu 2 non-veg dishes/);
    assert.match(html, /aria-pressed="true" class="menu-view menu-view-veg is-active"/);
  });

  it('the veg menu shows only veg dishes and only the categories that have them', () => {
    const html = show({ ...NO_FILTERS, view: 'VEG' });
    const full = text(html);
    assert.match(full, /2 dishes/);
    assert.doesNotMatch(full.slice(full.indexOf('2 dishes')), /Chicken/); // the dish list, after the switcher and toolbar
    assert.doesNotMatch(html, />Starters</); // no chip for a category without veg dishes
  });

  it('the non-veg menu shows non-veg dishes plus drinks, but no veg biryani', () => {
    const full = text(show({ ...NO_FILTERS, view: 'NON_VEG' }));
    const page = full.slice(full.indexOf('3 dishes'));
    assert.match(page, /Classic Chicken Dum Biryani/);
    assert.match(page, /Mango Lassi/);
    assert.doesNotMatch(page, /Classic Veg Dum Biryani/);
  });

  it('shows an active label filter as a removable pill', () => {
    const html = show({ ...NO_FILTERS, label: 'BESTSELLER' });
    assert.match(text(html), /Bestsellers/);
    assert.match(html, /aria-label="Remove filter: Bestsellers"/);
  });
});


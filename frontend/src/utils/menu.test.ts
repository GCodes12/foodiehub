import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MenuItem } from '../types/api.ts';
import {
  categoriesOf, categoryName, filterItems, groupByCategory, hasDietData, homeSelections, itemsInView, lowestPrice, NO_FILTERS,
  PAIRING_CATEGORIES, sortItems, viewDishCount, viewHighlights,
} from './menu.ts';

function item(id: string, over: Partial<MenuItem> = {}): MenuItem {
  return { id, name: id, price: 100, available: true, category: 'OTHER', description: null, diet: 'VEG',
    bestseller: false, chefSpecial: false, imageKey: null, ...over };
}

const MENU: MenuItem[] = [
  item('veg-dum', { name: 'Classic Veg Dum Biryani', category: 'VEG_BIRYANI', price: 229, bestseller: true }),
  item('egg', { name: 'Classic Egg Biryani', category: 'EGG_BIRYANI', price: 239, diet: 'EGG' }),
  item('chicken-dum', { name: 'Classic Chicken Dum Biryani', category: 'CHICKEN_BIRYANI', price: 299, diet: 'NON_VEG', bestseller: true }),
  item('special-mutton', { name: 'Special Mutton Biryani', category: 'MUTTON_BIRYANI', price: 459, diet: 'NON_VEG', chefSpecial: true }),
  item('c65', { name: 'Chicken 65', category: 'STARTERS', price: 249, diet: 'NON_VEG', description: 'Crispy fried chicken' }),
  item('raita', { name: 'Boondi Raita', category: 'ACCOMPANIMENTS', price: 59 }),
  item('phirni', { name: 'Phirni', category: 'DESSERTS', price: 89, available: false }),
  item('lassi', { name: 'Mango Lassi', category: 'BEVERAGES', price: 99, bestseller: true }),
  item('family', { name: 'Family Biryani Pack', category: 'COMBOS', price: 1299, diet: 'NON_VEG', chefSpecial: true }),
  item('new', { name: 'New Thing', category: 'SEASONAL' }),
];

describe('menu browsing', () => {
  it('orders categories as on the menu, with unknown ones last, and names them from the messages file', () => {
    assert.deepEqual(categoriesOf(MENU), ['VEG_BIRYANI', 'EGG_BIRYANI', 'CHICKEN_BIRYANI', 'MUTTON_BIRYANI', 'STARTERS',
      'ACCOMPANIMENTS', 'DESSERTS', 'BEVERAGES', 'COMBOS', 'SEASONAL']);
    assert.equal(categoryName('CHICKEN_BIRYANI'), 'Chicken Biryani');
    assert.equal(categoryName('SEASONAL'), 'Seasonal');
  });

  it('searches name, description and category, ignoring case and spaces', () => {
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, query: '  LASSI ' }).map((i) => i.id), ['lassi']);
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, query: 'crispy' }).map((i) => i.id), ['c65']);
    assert.equal(filterItems(MENU, { ...NO_FILTERS, query: 'biryani' }).length, 5); // 4 by name + family pack
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, query: 'zzz' }), []);
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, query: 'chicken 65' }).map((i) => i.id), ['c65']);
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, query: 'starters' }).map((i) => i.id), ['c65'], 'category names are searchable');
  });

  it('filters by category and by diet, combined', () => {
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, category: 'STARTERS' }).map((i) => i.id), ['c65']);
    assert.deepEqual(filterItems(MENU, { ...NO_FILTERS, diet: 'EGG' }).map((i) => i.id), ['egg']);
    assert.equal(filterItems(MENU, { ...NO_FILTERS, diet: 'NON_VEG' }).length, 4);
    assert.deepEqual(filterItems(MENU, { query: 'biryani', category: null, diet: 'VEG' }).map((i) => i.id), ['veg-dum']);
  });

  it('sorts by price both ways, keeps menu order for "recommended", and never puts sold-out dishes first', () => {
    const asc = sortItems(MENU, 'PRICE_ASC').map((i) => i.price);
    assert.deepEqual(asc.slice(0, 3), [59, 99, 100]);
    assert.equal(sortItems(MENU, 'PRICE_ASC').at(-1)!.id, 'phirni');
    assert.equal(sortItems(MENU, 'PRICE_DESC')[0].id, 'family');
    assert.deepEqual(sortItems(MENU, 'RECOMMENDED').slice(0, 3).map((i) => i.id), ['veg-dum', 'egg', 'chicken-dum']);
  });

  it('groups by category in menu order', () => {
    const groups = groupByCategory(filterItems(MENU, { ...NO_FILTERS, diet: 'NON_VEG' }));
    assert.deepEqual(groups.map((g) => g.category), ['CHICKEN_BIRYANI', 'MUTTON_BIRYANI', 'STARTERS', 'COMBOS']);
  });

  it('builds the home rows only from real labels and categories', () => {
    const home = homeSelections(MENU);
    assert.deepEqual(home.signature.map((i) => i.id), ['veg-dum', 'chicken-dum', 'special-mutton']);
    assert.deepEqual(home.bestsellers.map((i) => i.id), ['veg-dum', 'chicken-dum', 'lassi']);
    assert.deepEqual(home.vegFavourites.map((i) => i.id), ['veg-dum']);
    assert.deepEqual(home.nonVegFavourites.map((i) => i.id), ['chicken-dum', 'special-mutton', 'c65']);
    assert.deepEqual(home.startersAndSides.map((i) => i.id), ['c65', 'raita']);
    assert.deepEqual(home.combos.map((i) => i.id), ['family']);
    assert.equal(lowestPrice(MENU, 'VEG_BIRYANI'), 229);
    assert.equal(lowestPrice(MENU, 'CURRIES'), null);
  });

  it('filters by label, matching the home rows exactly (their "View all" links use these filters)', () => {
    const home = homeSelections(MENU);
    const ids = (label: 'BESTSELLER' | 'CHEF_SPECIAL' | 'SIGNATURE') => filterItems(MENU, { ...NO_FILTERS, label }).map((i) => i.id);
    assert.deepEqual(ids('SIGNATURE'), home.signature.map((i) => i.id));
    assert.deepEqual(ids('BESTSELLER'), home.bestsellers.map((i) => i.id));
    assert.deepEqual(ids('CHEF_SPECIAL'), ['special-mutton', 'family']);
    const veg = filterItems(MENU, { ...NO_FILTERS, diet: 'VEG' });
    assert.ok(home.vegFavourites.every((i) => veg.includes(i)), 'every veg favourite is in the Vegetarian filter');
    const nonVeg = filterItems(MENU, { ...NO_FILTERS, diet: 'NON_VEG' });
    assert.ok(home.nonVegFavourites.every((i) => nonVeg.includes(i)), 'every non-veg favourite is in the Non-vegetarian filter');
  });

  it('the Vegetarian filter returns every veg dish across all categories', () => {
    const veg = filterItems(MENU, { ...NO_FILTERS, diet: 'VEG' });
    assert.deepEqual(veg.map((i) => i.id), MENU.filter((i) => i.diet === 'VEG').map((i) => i.id));
    assert.ok(veg.length >= 5);
  });

  it('detects a menu without diet data (older Restaurant Service)', () => {
    assert.equal(hasDietData(MENU), true);
    assert.equal(hasDietData(MENU.map((i) => ({ ...i, diet: null }))), false);
  });

  it('menu views: veg = veg only; non-veg = non-veg and egg dishes plus veg sides, desserts and drinks', () => {
    const veg = itemsInView(MENU, 'VEG');
    assert.ok(veg.every((i) => i.diet === 'VEG'));
    const nonVeg = itemsInView(MENU, 'NON_VEG');
    assert.ok(nonVeg.some((i) => i.diet === 'EGG'));
    assert.ok(nonVeg.every((i) => i.diet !== 'VEG' || PAIRING_CATEGORIES.has(i.category)));
    assert.ok(!nonVeg.some((i) => i.id === 'veg-dum'));
    assert.equal(itemsInView(MENU, 'ALL').length, MENU.length);
    assert.equal(viewDishCount(MENU, 'NON_VEG'), MENU.filter((i) => i.diet === 'NON_VEG' || i.diet === 'EGG').length);
  });

  it('menu view combines with the other filters', () => {
    const nonVegBiryani = filterItems(MENU, { ...NO_FILTERS, view: 'NON_VEG', query: 'biryani' });
    assert.ok(nonVegBiryani.length > 0);
    assert.ok(nonVegBiryani.every((i) => i.diet !== 'VEG'));
  });

  it('view highlights pick one dish per category, labelled dishes first, never a side', () => {
    const picks = viewHighlights(MENU, 'NON_VEG');
    assert.ok(picks.length <= 3);
    assert.equal(new Set(picks.map((i) => i.category)).size, picks.length);
    assert.ok(picks[0].bestseller || picks[0].chefSpecial);
    assert.ok(picks.every((i) => !PAIRING_CATEGORIES.has(i.category)));
  });
});

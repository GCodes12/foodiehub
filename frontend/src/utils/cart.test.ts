import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_LINES, MAX_QUANTITY, addItem, cartTotalPaise, checkAgainstMenu, emptyCart, itemCount, parseCart, quantityOf,
  removeItem, setQuantity, toOrderRequest,
} from './cart.ts';
import type { MenuItem } from '../types/api.ts';
import type { Cart } from './cart.ts';

const R1 = 'restaurant-1';
const DOSA = { id: 'dosa', name: 'Masala Dosa', price: 129.5, imageKey: 'dosa', diet: 'VEG' as const, category: 'OTHER' };
const BIRYANI = { id: 'biryani', name: 'Veg Biryani', price: 199 };

function added(cart: Cart, restaurantId: string, item: { id: string; name: string; price: number }, quantity = 1): Cart {
  const result = addItem(cart, restaurantId, item, quantity);
  assert.ok(result.ok, `expected ${item.id} to be added`);
  return result.cart;
}

describe('cart', () => {
  it('adds items and increments the quantity of an item already in the cart', () => {
    let cart = added(emptyCart(), R1, DOSA);
    cart = added(cart, R1, DOSA);
    cart = added(cart, R1, BIRYANI);
    assert.equal(cart.restaurantId, R1);
    assert.deepEqual(cart.lines.map((l) => [l.menuItemId, l.quantity]), [['dosa', 2], ['biryani', 1]]);
    assert.equal(itemCount(cart), 3);
  });

  it('totals in whole paise without floating-point errors (the Postman example: 458.00)', () => {
    let cart = added(emptyCart(), R1, DOSA);
    cart = added(cart, R1, DOSA);
    cart = added(cart, R1, BIRYANI);
    assert.equal(cartTotalPaise(cart), 45800);

    const tenths = added(emptyCart(), R1, { id: 'a', name: 'A', price: 0.1 });
    assert.equal(cartTotalPaise(added(tenths, R1, { id: 'b', name: 'B', price: 0.2 })), 30); // not 30.000000000000004
  });

  it('refuses an item from another restaurant instead of mixing carts', () => {
    const cart = added(emptyCart(), R1, DOSA);
    assert.deepEqual(addItem(cart, 'restaurant-2', BIRYANI), { ok: false, reason: 'OTHER_RESTAURANT' });
  });

  it('enforces the server limits: at most 50 of an item and 20 different items', () => {
    let cart = setQuantity(added(emptyCart(), R1, DOSA), 'dosa', MAX_QUANTITY);
    assert.deepEqual(addItem(cart, R1, DOSA), { ok: false, reason: 'MAX_QUANTITY' });

    cart = emptyCart();
    for (let i = 0; i < MAX_LINES; i++) {
      cart = added(cart, R1, { id: `item-${i}`, name: `Item ${i}`, price: 10 });
    }
    assert.deepEqual(addItem(cart, R1, BIRYANI), { ok: false, reason: 'TOO_MANY_LINES' });
  });

  it('clamps quantities to 1–50 and removes a line set to 0', () => {
    const cart = added(emptyCart(), R1, DOSA);
    assert.equal(setQuantity(cart, 'dosa', 99).lines[0].quantity, 50);
    assert.equal(setQuantity(cart, 'dosa', 2.7).lines[0].quantity, 2);
    assert.deepEqual(setQuantity(cart, 'dosa', 0), emptyCart());
    assert.deepEqual(removeItem(cart, 'dosa'), emptyCart());
  });

  it('builds a pickup order request that contains no prices', () => {
    const cart = added(added(emptyCart(), R1, DOSA), R1, BIRYANI);
    const request = toOrderRequest(cart);
    assert.deepEqual(request, {
      restaurantId: R1,
      fulfilmentType: 'PICKUP',
      items: [{ menuItemId: 'dosa', quantity: 1 }, { menuItemId: 'biryani', quantity: 1 }],
    });
    assert.doesNotMatch(JSON.stringify(request), /price|amount|total/i, 'no price fields are sent');
    assert.throws(() => toOrderRequest(emptyCart()));
  });

  it('restores a stored cart and discards anything malformed', () => {
    const cart = added(emptyCart(), R1, DOSA);
    assert.deepEqual(parseCart(JSON.stringify(cart)), cart);
    assert.equal(parseCart(JSON.stringify(cart)).lines[0].imageKey, 'dosa');
    assert.deepEqual(parseCart(null), emptyCart());
    assert.deepEqual(parseCart('{not json'), emptyCart());
    assert.deepEqual(parseCart(JSON.stringify({ restaurantId: R1, lines: [{ menuItemId: 'x', name: 'X', unitPricePaise: 100, quantity: 500 }] })), emptyCart());
  });

  it('adds several at once (dish detail) without exceeding 50, and reports the quantity in the cart', () => {
    let cart = added(emptyCart(), R1, DOSA, 3);
    assert.equal(quantityOf(cart, R1, 'dosa'), 3);
    cart = added(cart, R1, DOSA, 49);
    assert.equal(quantityOf(cart, R1, 'dosa'), 50);
    assert.equal(quantityOf(cart, 'other', 'dosa'), 0);
  });

  it('checks the cart against the live menu: refreshes prices and flags sold-out or removed dishes', () => {
    const cart = added(added(added(emptyCart(), R1, DOSA), R1, BIRYANI), R1, { id: 'gone', name: 'Gone', price: 5 });
    const item = (over: Partial<MenuItem>): MenuItem => ({ id: 'x', name: 'x', price: 1, available: true, category: 'OTHER',
      description: null, diet: null, bestseller: false, chefSpecial: false, imageKey: null, ...over });
    const menu = [item({ id: 'dosa', name: 'Masala Dosa', price: 139.5 }), item({ id: 'biryani', name: 'Veg Biryani', price: 199, available: false })];
    const check = checkAgainstMenu(cart, R1, menu);
    assert.deepEqual(check.repricedIds, ['dosa']);
    assert.deepEqual(check.unavailableIds.sort(), ['biryani', 'gone']);
    assert.equal(check.cart.lines[0].unitPricePaise, 13950);
    assert.equal(cartTotalPaise(check.cart), 13950 + 19900 + 500);
    assert.deepEqual(checkAgainstMenu(cart, 'other-restaurant', menu).unavailableIds, []);
  });
});


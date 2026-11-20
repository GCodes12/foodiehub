import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALICE, render, text } from '../test/render.tsx';
import { addItem, emptyCart } from '../utils/cart.ts';
import { CartPage } from './CartPage.tsx';
import { CheckoutPage } from './CheckoutPage.tsx';

function cart() {
  let c = emptyCart();
  for (const [id, name, price, qty] of [['a', 'Classic Chicken Dum Biryani', 299, 2], ['b', 'Mango Lassi', 99, 1]] as const) {
    const r = addItem(c, 'r1', { id, name, price }, qty);
    assert.ok(r.ok);
    c = r.cart;
  }
  return c;
}

describe('Checkout and cart pages', () => {
  it('checkout reviews the lines, offers pickup only and shows the estimated total on the button', () => {
    const page = text(render(<CheckoutPage />, { auth: ALICE, cart: cart() }));
    assert.match(page, /Review your order/);
    assert.match(page, /Classic Chicken Dum Biryani/);
    assert.match(page, /Pickup/);
    assert.match(page, /Delivery isn't available yet\./);
    assert.match(page, /Place pickup order · ₹697\.00/);
    assert.match(page, /Ordering as Alice/);
  });

  it('checkout with an empty cart sends the customer back to the menu instead of offering to order', () => {
    const page = text(render(<CheckoutPage />, { auth: ALICE }));
    assert.match(page, /Nothing to check out/);
    assert.doesNotMatch(page, /Place pickup order/);
  });

  it('cart page shows line totals, the estimated total and the destructive "Clear cart" action', () => {
    const html = render(<CartPage />, { cart: cart() });
    assert.match(text(html), /₹598\.00/);
    assert.match(html, /data-testid="cart-total">₹697\.00</);
    assert.match(text(html), /Clear cart/);
    assert.match(text(html), /Proceed to checkout/);
  });

  it('empty cart shows the empty state with an Explore Menu link', () => {
    const html = render(<CartPage />);
    assert.match(text(html), /Your cart is empty/);
    assert.match(html, /href="\/menu"/);
  });
});

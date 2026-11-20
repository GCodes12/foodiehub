import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALICE, render, SIGNED_OUT, text } from '../../test/render.tsx';
import { addItem, emptyCart } from '../../utils/cart.ts';
import { Navbar } from './Navbar.tsx';

const cartWith3 = (() => {
  const r = addItem(emptyCart(), 'r1', { id: 'a', name: 'A', price: 10 }, 3);
  assert.ok(r.ok);
  return r.cart;
})();

describe('Navbar', () => {
  it('links to Home, Explore Menu and Our Story, and marks the current page', () => {
    const html = render(<Navbar />, { url: '/menu' });
    for (const [href, label] of [['/', 'Home'], ['/menu', 'Explore Menu'], ['/our-story', 'Our Story']]) {
      assert.match(html, new RegExp(`href="${href}"[^>]*>.*?${label}`), label);
    }
    assert.match(html, /class="nav-link is-active" href="\/menu"|href="\/menu"[^>]*class="nav-link is-active"/);
  });

  it('shows Login and hides My Orders when signed out', () => {
    const page = text(render(<Navbar />, { auth: SIGNED_OUT }));
    assert.match(page, /Login/);
    assert.doesNotMatch(page, /My Orders/);
  });

  it('shows the profile, Log out and My Orders when signed in', () => {
    const html = render(<Navbar />, { auth: ALICE });
    assert.match(text(html), /Alice/);
    assert.match(html, /aria-label="Log out"/);
    assert.match(html, /href="\/orders"/);
    assert.doesNotMatch(text(html), /Login/);
  });

  it('shows the cart item count, and no badge for an empty cart', () => {
    assert.match(render(<Navbar />, { cart: cartWith3 }), /data-testid="cart-count">3</);
    assert.match(render(<Navbar />, { cart: cartWith3 }), /aria-label="Cart, 3 items"/);
    assert.doesNotMatch(render(<Navbar />), /cart-count/);
  });

  it('has a hamburger button for the mobile drawer', () => {
    assert.match(render(<Navbar />), /aria-label="Open menu"/);
  });
});

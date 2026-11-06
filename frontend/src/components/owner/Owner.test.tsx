import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RequireRole } from '../layout/RequireRole.tsx';
import { Navbar } from '../layout/Navbar.tsx';
import { ALICE, menuItem, OWNER, render, SIGNED_OUT, text } from '../../test/render.tsx';
import type { Order } from '../../types/api.ts';
import { DishEditor } from './DishEditor.tsx';
import { OwnerOrderList } from './OwnerOrderList.tsx';

const kitchen = (
  <RequireRole role="RESTAURANT_OWNER" title="For restaurant owners" text="owners only"><p>kitchen content</p></RequireRole>
);
const checkout = (
  <RequireRole role="CUSTOMER" title="Ordering needs a customer account" text="customers only"><p>checkout content</p></RequireRole>
);

describe('roles in the UI (DEC-015)', () => {
  it('shows the Kitchen link to owners and My Orders to customers, never both', () => {
    const owner = text(render(<Navbar />, { auth: OWNER }));
    assert.match(owner, /Kitchen/);
    assert.doesNotMatch(owner, /My Orders/);
    const customer = text(render(<Navbar />, { auth: ALICE }));
    assert.match(customer, /My Orders/);
    assert.doesNotMatch(customer, /Kitchen/);
    assert.doesNotMatch(text(render(<Navbar />, { auth: SIGNED_OUT })), /Kitchen|My Orders/);
  });

  it('lets only owners into the kitchen', () => {
    assert.match(render(kitchen, { auth: OWNER }), /kitchen content/);
    const customer = text(render(kitchen, { auth: ALICE }));
    assert.doesNotMatch(customer, /kitchen content/);
    assert.match(customer, /For restaurant owners/);
    assert.match(text(render(kitchen, { auth: SIGNED_OUT })), /Please log in/);
  });

  it('lets only customers check out (Q-23)', () => {
    assert.match(render(checkout, { auth: ALICE }), /checkout content/);
    const owner = text(render(checkout, { auth: OWNER }));
    assert.doesNotMatch(owner, /checkout content/);
    assert.match(owner, /Ordering needs a customer account/);
    assert.match(owner, /Log in with another account/);
  });
});

describe('DishEditor', () => {
  it('shows the dish with an accessible availability switch', () => {
    const html = render(<DishEditor item={menuItem('a', { name: 'Mango Lassi', price: 99, bestseller: true })} onSave={async () => {}} />);
    assert.match(html, /role="switch" aria-checked="true"/);
    assert.match(html, /aria-label="Mango Lassi available to order"/);
    assert.match(text(html), /₹99\.00/);
    assert.match(text(html), /Bestseller/);
    assert.match(html, /aria-label="Edit Mango Lassi"/);
  });

  it('shows a sold-out dish as switched off', () => {
    const html = render(<DishEditor item={menuItem('p', { name: 'Phirni', available: false })} onSave={async () => {}} />);
    assert.match(html, /role="switch" aria-checked="false"/);
    assert.match(text(html), /Sold out/);
  });
});

describe('OwnerOrderList', () => {
  const order = (id: string, createdAt: string, total: number): Order => ({
    id, status: 'PENDING_PAYMENT', restaurantId: 'r1', fulfilmentType: 'PICKUP', currency: 'INR', subtotal: total, total, createdAt,
    items: [{ menuItemId: 'm', name: 'Classic Chicken Dum Biryani', unitPrice: total / 2, quantity: 2, lineAmount: total }],
  });

  it("summarises today's orders and lists each order with its lines and total", () => {
    const now = new Date('2026-11-06T12:00:00');
    const html = render(<OwnerOrderList now={now} orders={[
      order('aaaaaaaa-1', new Date('2026-11-06T10:00:00').toISOString(), 598),
      order('bbbbbbbb-2', new Date('2026-11-05T10:00:00').toISOString(), 299),
    ]} />);
    assert.match(html, /data-testid="orders-today">1</);
    const page = text(html);
    assert.match(page, /₹598\.00/);
    assert.match(page, /AAAAAAAA/);
    assert.match(page, /2 × Classic Chicken Dum Biryani/);
    assert.match(page, /Waiting for the restaurant/);
  });

  it('shows an empty state without orders', () => {
    assert.match(text(render(<OwnerOrderList orders={[]} />)), /No orders yet/);
  });

  it('offers Accept and Reject for a new order and exactly one next step afterwards', () => {
    const noop = () => {};
    const actions = { onAccept: noop, onReject: noop, onAdvance: noop };
    const html = render(<OwnerOrderList actions={actions} orders={[
      { ...order('aaaaaaaa-1', new Date().toISOString(), 10), status: 'PENDING_PAYMENT' },
      { ...order('bbbbbbbb-2', new Date().toISOString(), 10), status: 'ACCEPTED' },
      { ...order('cccccccc-3', new Date().toISOString(), 10), status: 'PREPARING' },
      { ...order('dddddddd-4', new Date().toISOString(), 10), status: 'READY_FOR_PICKUP' },
    ]} />);
    const page = text(html);
    assert.match(page, /AAAAAAAA.*Reject.*Accept.*BBBBBBBB.*Start preparing.*CCCCCCCC.*Mark ready.*DDDDDDDD.*Picked up/);
    assert.match(html, /data-testid="orders-waiting">1</);
    assert.equal((page.match(/Accept\b/g) ?? []).length, 1);
  });

  it('shows no buttons on finished orders, and the reason for a rejection', () => {
    const html = render(<OwnerOrderList actions={{ onAccept: () => {}, onReject: () => {}, onAdvance: () => {} }} orders={[
      { ...order('eeeeeeee-5', new Date().toISOString(), 10), status: 'REJECTED', rejectReason: 'TOO_BUSY' },
      { ...order('ffffffff-6', new Date().toISOString(), 10), status: 'PICKED_UP' },
    ]} />);
    assert.doesNotMatch(html, /owner-order-actions/);
    assert.match(text(html), /Reason: The kitchen is too busy right now\./);
  });
});


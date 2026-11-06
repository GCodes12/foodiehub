import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, text } from '../../test/render.tsx';
import type { Order } from '../../types/api.ts';
import { OrderDetails } from './OrderDetails.tsx';

const ORDER: Order = {
  id: 'de837ba2-dd2a-4f25-aa30-d6ddeed9298d', status: 'PENDING_PAYMENT', restaurantId: 'r1', fulfilmentType: 'PICKUP',
  currency: 'INR', subtotal: 757, total: 757, createdAt: '2026-11-06T06:13:20.331743Z',
  items: [
    { menuItemId: 'a', name: 'Classic Chicken Dum Biryani', unitPrice: 299, quantity: 2, lineAmount: 598 },
    { menuItemId: 'b', name: 'Boondi Raita', unitPrice: 59, quantity: 1, lineAmount: 59 },
    { menuItemId: 'c', name: 'Masala Chaas', unitPrice: 100, quantity: 1, lineAmount: 100 },
  ],
};

describe('OrderDetails (confirmation)', () => {
  it('shows the server-calculated lines and total exactly as returned', () => {
    const html = render(<OrderDetails order={ORDER} restaurantName="ZAYORA" />);
    const page = text(html);
    assert.match(page, /2 × ₹299\.00/);
    assert.match(page, /₹598\.00/);
    assert.match(html, /data-testid="order-total">₹757\.00</);
  });

  it('shows the order number, restaurant, pickup, status and that it is not paid', () => {
    const page = text(render(<OrderDetails order={ORDER} restaurantName="ZAYORA" />));
    assert.match(page, /DE837BA2/);
    assert.match(page, /de837ba2-dd2a-4f25-aa30-d6ddeed9298d/);
    assert.match(page, /ZAYORA/);
    assert.match(page, /Pickup/);
    assert.match(page, /Pending payment/);
    assert.match(page, /has not been paid/);
  });

  it('shows an unknown future status as returned instead of inventing a label', () => {
    assert.match(text(render(<OrderDetails order={{ ...ORDER, status: 'ACCEPTED' }} restaurantName={null} />)), /ACCEPTED/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CreateOrderRequest } from '../types/api.ts';
import { forgetIdempotencyKey, idempotencyKeyFor } from './checkout.ts';
import type { KeyStorage } from './checkout.ts';

function memory(): KeyStorage {
  const values = new Map<string, string>();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => void values.set(k, v),
    removeItem: (k) => void values.delete(k),
  };
}

function counter() {
  let n = 0;
  return () => `key-${++n}`;
}

const REQUEST: CreateOrderRequest = {
  restaurantId: 'r1',
  fulfilmentType: 'PICKUP',
  items: [{ menuItemId: 'dosa', quantity: 2 }],
};

describe('idempotency key per checkout attempt', () => {
  it('reuses the key when the same cart is submitted again (retry, double click, reload)', () => {
    const storage = memory();
    const next = counter();
    assert.equal(idempotencyKeyFor(REQUEST, storage, next), 'key-1');
    assert.equal(idempotencyKeyFor({ ...REQUEST, items: [{ menuItemId: 'dosa', quantity: 2 }] }, storage, next), 'key-1');
  });

  it('uses a new key when the cart changes, so the server never sees one key with two different orders', () => {
    const storage = memory();
    const next = counter();
    idempotencyKeyFor(REQUEST, storage, next);
    assert.equal(idempotencyKeyFor({ ...REQUEST, items: [{ menuItemId: 'dosa', quantity: 3 }] }, storage, next), 'key-2');
  });

  it('starts a new attempt after the order was placed', () => {
    const storage = memory();
    const next = counter();
    idempotencyKeyFor(REQUEST, storage, next);
    forgetIdempotencyKey(storage);
    assert.equal(idempotencyKeyFor(REQUEST, storage, next), 'key-2');
  });

  it('ignores a corrupt stored entry', () => {
    const storage = memory();
    storage.setItem('foodiehub.checkout', '{oops');
    assert.equal(idempotencyKeyFor(REQUEST, storage, counter()), 'key-1');
  });

  it('generates keys the server accepts by default (UUID: 36 chars of [A-Za-z0-9-])', () => {
    assert.match(idempotencyKeyFor(REQUEST, memory()), /^[A-Za-z0-9_-]{8,64}$/);
  });
});

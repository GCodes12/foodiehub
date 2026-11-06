import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Order } from '../types/api.ts';
import { awaitsDecision, isActive, isFinal, nextStep, splitOrders, trackerSteps } from './orderStatus.ts';

const order = (id: string, status: string, history: Order['history'] = []): Order => ({
  id, status, restaurantId: 'r', fulfilmentType: 'PICKUP', currency: 'INR', subtotal: 1, total: 1,
  createdAt: '2026-11-06T10:00:00Z', items: [], history,
});

describe('order status (DEC-016)', () => {
  it('offers accept/reject for a new order, then exactly one step forward, then nothing', () => {
    assert.equal(awaitsDecision('PENDING_PAYMENT'), true);
    assert.equal(nextStep('PENDING_PAYMENT'), null);
    assert.equal(nextStep('ACCEPTED'), 'PREPARING');
    assert.equal(nextStep('PREPARING'), 'READY_FOR_PICKUP');
    assert.equal(nextStep('READY_FOR_PICKUP'), 'PICKED_UP');
    assert.equal(nextStep('PICKED_UP'), null);
    assert.equal(nextStep('REJECTED'), null);
    assert.equal(isFinal('REJECTED') && isFinal('PICKED_UP') && !isFinal('PREPARING'), true);
  });

  it('builds the customer tracker with done / current / next steps and their times', () => {
    const steps = trackerSteps(order('o', 'PREPARING', [
      { status: 'ACCEPTED', at: '2026-11-06T10:05:00Z' }, { status: 'PREPARING', at: '2026-11-06T10:07:00Z' }]));
    assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'current', 'next', 'next']);
    assert.equal(steps[0].at, '2026-11-06T10:00:00Z');
    assert.equal(steps[2].at, '2026-11-06T10:07:00Z');
    assert.equal(steps[3].at, null);
    assert.deepEqual(trackerSteps(order('o', 'PICKED_UP')).map((s) => s.state), ['done', 'done', 'done', 'done', 'done']);
    assert.deepEqual(trackerSteps(order('o', 'PENDING_PAYMENT')).map((s) => s.state)[0], 'current');
  });

  it('splits kitchen orders into active and history, keeping their order', () => {
    const { active, history } = splitOrders([order('a', 'PENDING_PAYMENT'), order('b', 'PICKED_UP'), order('c', 'READY_FOR_PICKUP'), order('d', 'REJECTED')]);
    assert.deepEqual(active.map((o) => o.id), ['a', 'c']);
    assert.deepEqual(history.map((o) => o.id), ['b', 'd']);
    assert.equal(isActive('ACCEPTED'), true);
  });
});

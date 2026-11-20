import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { hasMessage, t } from './i18n.ts';

const SRC = new URL('..', import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('messages', () => {
  it('fills placeholders and picks plural forms', () => {
    assert.equal(t('dish.added', { name: 'Mango Lassi' }), 'Mango Lassi added to cart');
    assert.equal(t('cart.items', { count: 1 }), '1 item');
    assert.equal(t('cart.items', { count: 3 }), '3 items');
    assert.equal(t('menu.maxQuantity', { max: 50 }), 'You can order at most 50 of one dish.');
  });

  it('shows the key itself for a missing message, so gaps are visible instead of blank', () => {
    assert.equal(t('does.not.exist'), 'does.not.exist');
    assert.equal(hasMessage('does.not.exist'), false);
  });

  it('has a message for every literal key used in the source code', () => {
    const missing: string[] = [];
    let checked = 0;
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      const keys = [
        ...[...text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]),
        // keys listed in tables, e.g. { label: 'nav.home' } or { title: 'home.vegTitle' }
        ...[...text.matchAll(/\b(?:label|title|subtitle|text): '([a-z]+\.[a-zA-Z0-9_.]+)'/g)].map((m) => m[1]),
      ];
      for (const key of keys) {
        checked++;
        if (!hasMessage(key) && !hasMessage(`${key}_other`)) {
          missing.push(`${file.replace(SRC, '')}: ${key}`);
        }
      }
    }
    assert.ok(checked > 150, `only ${checked} keys found — is the scan broken?`);
    assert.deepEqual(missing, []);
  });

  it('has a message for every API error code the backends can return', () => {
    const codes = [
      'VALIDATION_FAILED', 'MALFORMED_REQUEST', 'INVALID_IDEMPOTENCY_KEY', 'DUPLICATE_ITEM', 'ITEM_NOT_IN_MENU',
      'ITEM_UNAVAILABLE', 'AMOUNT_TOO_LARGE', 'EMPTY_ORDER', 'RESTAURANT_NOT_AVAILABLE', 'IDEMPOTENCY_KEY_REUSED',
      'PRICING_UNAVAILABLE', 'STORAGE_FAILED', 'ORDER_NOT_FOUND', 'RESTAURANT_NOT_FOUND',
    ];
    assert.deepEqual(codes.filter((code) => !hasMessage(`errors.${code}`)), []);
  });

  it('names every menu category, diet and sort mode, and the texts built from dynamic keys', () => {
    for (const code of ['VEG_BIRYANI', 'PANEER_BIRYANI', 'EGG_BIRYANI', 'CHICKEN_BIRYANI', 'MUTTON_BIRYANI', 'STARTERS',
      'CURRIES', 'ACCOMPANIMENTS', 'DESSERTS', 'BEVERAGES', 'COMBOS']) {
      assert.ok(hasMessage(`categories.${code}.name`), code);
    }
    for (const key of ['diet.VEG', 'diet.EGG', 'diet.NON_VEG', 'menu.sort.RECOMMENDED', 'menu.sort.PRICE_ASC', 'menu.sort.PRICE_DESC',
      'order.statuses.PENDING_PAYMENT', 'order.fulfilmentTypes.PICKUP', 'errors.status.400', 'errors.status.401', 'errors.status.404']) {
      assert.ok(hasMessage(key), key);
    }
    for (const r of ['r1', 'r2', 'r3']) {
      assert.ok(hasMessage(`home.reviews.${r}Text`) && hasMessage(`home.reviews.${r}Name`), r);
    }
    for (const p of ['dum', 'spices', 'fresh', 'promise']) {
      assert.ok(hasMessage(`story.${p}Title`) && hasMessage(`story.${p}Text`), p);
    }
  });
});

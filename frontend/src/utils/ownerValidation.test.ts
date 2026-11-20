import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasErrors, validateDishEdit } from './ownerValidation.ts';

describe('owner dish edit validation', () => {
  it('accepts positive prices with up to two decimals', () => {
    for (const price of ['1', '99', '129.5', '1299.00', '99999999.99']) {
      assert.equal(hasErrors(validateDishEdit({ price, description: '' })), false, price);
    }
  });

  it('rejects zero, negative, too many decimals, too large or non-numeric prices', () => {
    assert.equal(validateDishEdit({ price: '0', description: '' }).price, 'kitchen.errors.pricePositive');
    assert.equal(validateDishEdit({ price: '0.00', description: '' }).price, 'kitchen.errors.pricePositive');
    assert.equal(validateDishEdit({ price: '10.555', description: '' }).price, 'kitchen.errors.priceDecimals');
    for (const price of ['-5', '100000000', 'abc', '', '1e3', '12,50']) {
      assert.equal(validateDishEdit({ price, description: '' }).price, 'kitchen.errors.priceFormat', price);
    }
  });

  it('limits the description to 300 characters', () => {
    assert.equal(hasErrors(validateDishEdit({ price: '10', description: 'x'.repeat(300) })), false);
    assert.equal(validateDishEdit({ price: '10', description: 'x'.repeat(301) }).description, 'kitchen.errors.descriptionLength');
  });
});

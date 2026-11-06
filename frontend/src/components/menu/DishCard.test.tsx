import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { menuItem, render, text } from '../../test/render.tsx';
import { DishCard } from './DishCard.tsx';

const noop = () => {};
const BIRYANI = menuItem('cd', {
  name: 'Classic Chicken Dum Biryani', price: 299, diet: 'NON_VEG', bestseller: true, category: 'CHICKEN_BIRYANI',
  description: 'Slow-cooked in a handi.',
});

describe('DishCard', () => {
  it('shows name, description, INR price, diet mark and labels', () => {
    const html = render(<DishCard item={BIRYANI} quantity={0} onAdd={noop} onQuantity={noop} onOpen={noop} />);
    const page = text(html);
    assert.match(page, /Classic Chicken Dum Biryani/);
    assert.match(page, /Slow-cooked in a handi\./);
    assert.match(page, /₹299\.00/);
    assert.match(page, /Bestseller/);
    assert.doesNotMatch(page, /Chef's special/);
    assert.match(html, /aria-label="Non-vegetarian"/);
    assert.match(html, /aria-label="Add Classic Chicken Dum Biryani to cart"/);
  });

  it('shows quantity controls instead of Add when the dish is in the cart', () => {
    const html = render(<DishCard item={BIRYANI} quantity={2} onAdd={noop} onQuantity={noop} onOpen={noop} />);
    assert.match(html, /aria-label="Quantity of Classic Chicken Dum Biryani"/);
    assert.doesNotMatch(html, /aria-label="Add Classic/);
  });

  it('marks a sold-out dish and offers no Add button', () => {
    const html = render(<DishCard item={menuItem('p', { name: 'Phirni', available: false })} quantity={0} onAdd={noop} onQuantity={noop} onOpen={noop} />);
    assert.match(text(html), /Sold out/);
    assert.match(text(html), /Currently unavailable/);
    assert.doesNotMatch(html, /aria-label="Add Phirni/);
  });

  it('shows no diet mark when the diet is not specified', () => {
    assert.doesNotMatch(render(<DishCard item={menuItem('x', { diet: null })} quantity={0} onAdd={noop} onQuantity={noop} onOpen={noop} />), /diet-mark/);
  });
});

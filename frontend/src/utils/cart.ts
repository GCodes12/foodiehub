import type { CreateOrderRequest, Diet, MenuItem } from '../types/api.ts';
import { toPaise } from './money.ts';

// Same technical limits as the Order Service (DEC-013): at most 20 lines, quantity 1–50 per line.
export const MAX_LINES = 20;
export const MAX_QUANTITY = 50;

export interface CartLine {
  menuItemId: string;
  name: string;
  /** Menu price for display only; the server always prices the order itself. */
  unitPricePaise: number;
  quantity: number;
  imageKey: string | null;
  diet: Diet | null;
  category: string;
}

/** A cart belongs to one restaurant (multi-restaurant carts are out of scope). */
export interface Cart {
  restaurantId: string | null;
  lines: CartLine[];
}

export type MenuItemLike = Pick<MenuItem, 'id' | 'name' | 'price'> & Partial<Pick<MenuItem, 'imageKey' | 'diet' | 'category'>>;

export type AddResult =
  | { ok: true; cart: Cart }
  | { ok: false; reason: 'OTHER_RESTAURANT' | 'TOO_MANY_LINES' | 'MAX_QUANTITY' };

export function emptyCart(): Cart {
  return { restaurantId: null, lines: [] };
}

/** Adds `quantity` (default 1) of a dish; the total for that dish never exceeds 50. */
export function addItem(cart: Cart, restaurantId: string, item: MenuItemLike, quantity = 1): AddResult {
  if (cart.lines.length > 0 && cart.restaurantId !== restaurantId) {
    return { ok: false, reason: 'OTHER_RESTAURANT' };
  }
  const amount = Math.max(1, Math.floor(quantity));
  const lines = cart.restaurantId === restaurantId ? cart.lines : [];
  const existing = lines.find((line) => line.menuItemId === item.id);
  if (existing) {
    if (existing.quantity >= MAX_QUANTITY) {
      return { ok: false, reason: 'MAX_QUANTITY' };
    }
    const next = Math.min(MAX_QUANTITY, existing.quantity + amount);
    return {
      ok: true,
      cart: { restaurantId, lines: lines.map((line) => (line === existing ? { ...line, quantity: next } : line)) },
    };
  }
  if (lines.length >= MAX_LINES) {
    return { ok: false, reason: 'TOO_MANY_LINES' };
  }
  const added: CartLine = {
    menuItemId: item.id,
    name: item.name,
    unitPricePaise: toPaise(item.price),
    quantity: Math.min(MAX_QUANTITY, amount),
    imageKey: item.imageKey ?? null,
    diet: item.diet ?? null,
    category: item.category ?? 'OTHER',
  };
  return { ok: true, cart: { restaurantId, lines: [...lines, added] } };
}

/** Sets a line's quantity, clamped to 1–50; 0 or less removes the line. */
export function setQuantity(cart: Cart, menuItemId: string, quantity: number): Cart {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return removeItem(cart, menuItemId);
  }
  const clamped = Math.min(MAX_QUANTITY, Math.floor(quantity));
  return {
    ...cart,
    lines: cart.lines.map((line) => (line.menuItemId === menuItemId ? { ...line, quantity: clamped } : line)),
  };
}

export function removeItem(cart: Cart, menuItemId: string): Cart {
  const lines = cart.lines.filter((line) => line.menuItemId !== menuItemId);
  return lines.length === 0 ? emptyCart() : { ...cart, lines };
}

export function quantityOf(cart: Cart, restaurantId: string, menuItemId: string): number {
  if (cart.restaurantId !== restaurantId) {
    return 0;
  }
  return cart.lines.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0;
}

export function lineTotalPaise(line: CartLine): number {
  return line.unitPricePaise * line.quantity;
}

export function cartTotalPaise(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + lineTotalPaise(line), 0);
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export interface CartCheck {
  cart: Cart;
  /** Lines whose dish is no longer on the menu or is sold out: checkout must wait until they are removed. */
  unavailableIds: string[];
  /** Lines whose display price changed to the current menu price. */
  repricedIds: string[];
}

/** Refreshes names and display prices from the current menu and flags dishes that cannot be ordered. */
export function checkAgainstMenu(cart: Cart, restaurantId: string, items: MenuItem[]): CartCheck {
  if (cart.restaurantId !== restaurantId) {
    return { cart, unavailableIds: [], repricedIds: [] };
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const unavailableIds: string[] = [];
  const repricedIds: string[] = [];
  const lines = cart.lines.map((line) => {
    const item = byId.get(line.menuItemId);
    if (!item || !item.available) {
      unavailableIds.push(line.menuItemId);
      return line;
    }
    const price = toPaise(item.price);
    if (price !== line.unitPricePaise) {
      repricedIds.push(line.menuItemId);
    }
    return { ...line, name: item.name, unitPricePaise: price, imageKey: item.imageKey, diet: item.diet, category: item.category };
  });
  return { cart: { ...cart, lines }, unavailableIds, repricedIds };
}

/** The checkout request. Prices are deliberately not sent: the server prices every order itself. */
export function toOrderRequest(cart: Cart): CreateOrderRequest {
  if (!cart.restaurantId || cart.lines.length === 0) {
    throw new Error('The cart is empty');
  }
  return {
    restaurantId: cart.restaurantId,
    fulfilmentType: 'PICKUP',
    items: cart.lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
  };
}

/** Reads a stored cart; anything malformed is discarded rather than trusted. */
export function parseCart(raw: string | null): Cart {
  if (!raw) {
    return emptyCart();
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.restaurantId !== 'string' || !Array.isArray(value.lines)) {
      return emptyCart();
    }
    const lines = value.lines.filter(isCartLine).slice(0, MAX_LINES).map((line) => ({
      menuItemId: line.menuItemId,
      name: line.name,
      unitPricePaise: line.unitPricePaise,
      quantity: line.quantity,
      imageKey: typeof line.imageKey === 'string' ? line.imageKey : null,
      diet: line.diet === 'VEG' || line.diet === 'EGG' || line.diet === 'NON_VEG' ? line.diet : null,
      category: typeof line.category === 'string' ? line.category : 'OTHER',
    }));
    return lines.length === 0 ? emptyCart() : { restaurantId: value.restaurantId, lines };
  } catch {
    return emptyCart();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCartLine(value: unknown): value is CartLine {
  return (
    isRecord(value) &&
    typeof value.menuItemId === 'string' &&
    typeof value.name === 'string' &&
    Number.isInteger(value.unitPricePaise) &&
    Number.isInteger(value.quantity) &&
    (value.quantity as number) >= 1 &&
    (value.quantity as number) <= MAX_QUANTITY
  );
}

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { AuthContext } from '../context/AuthContext.tsx';
import type { AuthContextValue } from '../context/AuthContext.tsx';
import { CartContext } from '../context/CartContext.tsx';
import type { CartContextValue } from '../context/CartContext.tsx';
import type { MenuItem } from '../types/api.ts';
import { cartTotalPaise, emptyCart, itemCount } from '../utils/cart.ts';
import type { Cart } from '../utils/cart.ts';

// Test helper: renders a component to HTML (react-dom/server) inside the app's router and context providers.

export const SIGNED_OUT: AuthContextValue = {
  available: true, signedIn: false, username: null, displayName: null, sessionExpired: false, roles: [],
  login: () => {}, logout: () => {},
};

export const ALICE: AuthContextValue = { ...SIGNED_OUT, signedIn: true, username: 'alice', displayName: 'Alice', roles: ['CUSTOMER'] };

export const OWNER: AuthContextValue = { ...SIGNED_OUT, signedIn: true, username: 'owner', displayName: 'Owner', roles: ['RESTAURANT_OWNER'] };

export function cartValue(cart: Cart = emptyCart()): CartContextValue {
  return {
    cart, count: itemCount(cart), totalPaise: cartTotalPaise(cart),
    add: () => ({ ok: true, cart }), setQuantity: () => {}, remove: () => {}, clear: () => {}, replace: () => {},
  };
}

export function render(ui: ReactElement, { auth = SIGNED_OUT, cart = emptyCart(), url = '/' }: {
  auth?: AuthContextValue; cart?: Cart; url?: string;
} = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <AuthContext.Provider value={auth}>
        <CartContext.Provider value={cartValue(cart)}>{ui}</CartContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

/** Visible text only (tags removed, entities decoded, spaces collapsed). */
export function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

export function menuItem(id: string, over: Partial<MenuItem> = {}): MenuItem {
  return { id, name: id, price: 100, available: true, category: 'OTHER', description: null, diet: 'VEG',
    bestseller: false, chefSpecial: false, imageKey: null, ...over };
}

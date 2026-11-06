import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { localStore } from '../services/storage.ts';
import type { MenuItem } from '../types/api.ts';
import {
  addItem, cartTotalPaise, emptyCart, itemCount, parseCart, removeItem, setQuantity,
} from '../utils/cart.ts';
import type { AddResult, Cart } from '../utils/cart.ts';

const CART_KEY = 'zayora.cart';

export interface CartContextValue {
  cart: Cart;
  count: number;
  totalPaise: number;
  add: (restaurantId: string, item: MenuItem, quantity?: number, replaceOtherRestaurant?: boolean) => AddResult;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  replace: (cart: Cart) => void;
}

const noop = () => {};

/** Exported so tests can provide a fixed cart. */
export const CartContext = createContext<CartContextValue>({
  cart: emptyCart(),
  count: 0,
  totalPaise: 0,
  add: () => ({ ok: false, reason: 'OTHER_RESTAURANT' }),
  setQuantity: noop,
  remove: noop,
  clear: noop,
  replace: noop,
});

export function useCart(): CartContextValue {
  return useContext(CartContext);
}

/** The cart, kept in localStorage so it survives refreshes, the sign-in redirect and browser restarts. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => parseCart(localStore.getItem(CART_KEY)));

  useEffect(() => {
    localStore.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_KEY) {
        setCart(parseCart(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((restaurantId: string, item: MenuItem, quantity = 1, replaceOther = false): AddResult => {
    let result = addItem(cart, restaurantId, item, quantity);
    if (!result.ok && result.reason === 'OTHER_RESTAURANT' && replaceOther) {
      result = addItem(emptyCart(), restaurantId, item, quantity);
    }
    if (result.ok) {
      setCart(result.cart);
    }
    return result;
  }, [cart]);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    count: itemCount(cart),
    totalPaise: cartTotalPaise(cart),
    add,
    setQuantity: (id, quantity) => setCart((c) => setQuantity(c, id, quantity)),
    remove: (id) => setCart((c) => removeItem(c, id)),
    clear: () => setCart(emptyCart()),
    replace: setCart,
  }), [cart, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

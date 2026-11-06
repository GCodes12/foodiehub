import { useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext.tsx';
import { checkAgainstMenu } from '../utils/cart.ts';
import { useMenu } from './useMenu.ts';

/**
 * Compares the cart with the live menu: refreshes display prices and names, and reports dishes that can no longer
 * be ordered. The server still prices the order itself; this only keeps what the customer sees honest.
 */
export function useCartCheck() {
  const cartState = useCart();
  const menu = useMenu();
  const check = useMemo(() => (menu.status === 'ready' && cartState.cart.restaurantId
    ? checkAgainstMenu(cartState.cart, menu.data.restaurant.id, menu.data.items)
    : null), [menu, cartState.cart]);

  const changed = check !== null && JSON.stringify(check.cart) !== JSON.stringify(cartState.cart);
  useEffect(() => {
    if (changed && check) {
      cartState.replace(check.cart);
    }
  }, [changed, check, cartState]);

  const foreign = menu.status === 'ready' && cartState.cart.lines.length > 0
    && cartState.cart.restaurantId !== menu.data.restaurant.id;

  return {
    ...cartState,
    menu,
    unavailableIds: new Set(check?.unavailableIds ?? []),
    repricedIds: new Set(check?.repricedIds ?? []),
    /** The cart belongs to a restaurant that is not ZAYORA's current one. */
    foreign,
    ready: menu.status === 'ready',
  };
}

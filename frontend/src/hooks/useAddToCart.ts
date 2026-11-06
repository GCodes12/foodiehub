import { useCallback } from 'react';
import { useToast } from '../components/common/Toast.tsx';
import { useCart } from '../context/CartContext.tsx';
import type { MenuItem } from '../types/api.ts';
import { MAX_LINES, MAX_QUANTITY } from '../utils/cart.ts';
import { t } from '../utils/i18n.ts';

/** Adds a dish with the usual feedback: a toast, the 50/20 limits, and a confirmation before replacing a cart. */
export function useAddToCart(): (restaurantId: string, item: MenuItem, quantity?: number) => boolean {
  const { add } = useCart();
  const toast = useToast();
  return useCallback((restaurantId, item, quantity = 1) => {
    let result = add(restaurantId, item, quantity);
    if (!result.ok && result.reason === 'OTHER_RESTAURANT') {
      if (!window.confirm(t('menu.otherRestaurant'))) {
        return false;
      }
      result = add(restaurantId, item, quantity, true);
    }
    if (result.ok) {
      toast(quantity > 1 ? t('dish.addedMany', { quantity, name: item.name }) : t('dish.added', { name: item.name }));
      return true;
    }
    toast(result.reason === 'MAX_QUANTITY' ? t('menu.maxQuantity', { max: MAX_QUANTITY }) : t('menu.tooManyLines', { max: MAX_LINES }));
    return false;
  }, [add, toast]);
}

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api.ts';
import { api } from '../services/client.ts';
import type { MenuItem, RestaurantSummary } from '../types/api.ts';

// ZAYORA's restaurant and menu, loaded once and shared by every page. The restaurant is VITE_RESTAURANT_ID when
// set, otherwise the first active restaurant the Restaurant Service lists (VS-1 seeds exactly one, DEC-003).

export interface MenuData {
  restaurant: RestaurantSummary;
  items: MenuItem[];
}

export type MenuState =
  | { status: 'loading' }
  | { status: 'ready'; data: MenuData }
  | { status: 'error'; error: unknown };

let cache: Promise<MenuData> | null = null;

async function loadMenu(): Promise<MenuData> {
  const configured = import.meta.env?.VITE_RESTAURANT_ID as string | undefined;
  let restaurant: RestaurantSummary;
  if (configured) {
    restaurant = await api.getRestaurant(configured);
  } else {
    const list = await api.listRestaurants();
    if (list.length === 0) {
      throw new ApiError(404, 'NO_RESTAURANT', null);
    }
    restaurant = list[0];
  }
  const menu = await api.getMenu(restaurant.id);
  return { restaurant, items: menu.items };
}

function fetchMenu(force: boolean): Promise<MenuData> {
  if (!cache || force) {
    cache = loadMenu();
    cache.catch(() => {
      cache = null; // a failed load is retried next time
    });
  }
  return cache;
}

/** Forget the cached menu, e.g. after an owner changed it; the next page that needs it reloads it. */
export function invalidateMenu(): void {
  cache = null;
}

export function useMenu(): MenuState & { reload: () => void } {
  const [state, setState] = useState<MenuState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetchMenu(version > 0).then(
      (data) => active && setState({ status: 'ready', data }),
      (error: unknown) => active && setState({ status: 'error', error }));
    return () => {
      active = false;
    };
  }, [version]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((v) => v + 1);
  }, []);

  return { ...state, reload };
}

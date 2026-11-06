export const paths = {
  home: () => '/',
  menu: (params: { category?: string; diet?: 'VEG' | 'EGG' | 'NON_VEG'; label?: string; dish?: string } = {}) => {
    const search = new URLSearchParams();
    for (const key of ['category', 'diet', 'label', 'dish'] as const) {
      const value = params[key];
      if (value) {
        search.set(key, value);
      }
    }
    const query = search.toString();
    return `/menu${query ? `?${query}` : ''}`;
  },
  story: () => '/our-story',
  cart: () => '/cart',
  checkout: () => '/checkout',
  myOrders: () => '/orders',
  kitchen: (tab?: 'orders') => `/kitchen${tab ? `?tab=${tab}` : ''}`,
  order: (orderId: string, justPlaced = false) => `/orders/${encodeURIComponent(orderId)}${justPlaced ? '?placed=1' : ''}`,
};

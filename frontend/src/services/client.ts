import { createApi } from './api.ts';
import { authService, markSessionExpired } from './auth.ts';

/** The app's API client: the signed-in user's access token is added to order calls automatically. */
export const api = createApi(() => authService.getToken(), {
  restaurantBaseUrl: import.meta.env?.VITE_RESTAURANT_API_URL ?? '',
  orderBaseUrl: import.meta.env?.VITE_ORDER_API_URL ?? '',
  onUnauthorized: markSessionExpired,
});

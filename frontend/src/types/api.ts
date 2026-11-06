// Types for the backend's actual response contracts (Restaurant Service MenuResponse/RestaurantResponse,
// Order Service OrderResponse, RFC 9457 Problem Details). Prices are JSON numbers with two decimals (INR).

export type Diet = 'VEG' | 'EGG' | 'NON_VEG';

export interface RestaurantSummary {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
  /** Menu section code, e.g. CHICKEN_BIRYANI (DEC-014). "OTHER" when the restaurant has not set one. */
  category: string;
  description: string | null;
  /** null = not specified; no indicator is shown. */
  diet: Diet | null;
  bestseller: boolean;
  chefSpecial: boolean;
  /** Name of the dish photo in src/assets/dishes; null = placeholder artwork. */
  imageKey: string | null;
}

export interface Menu {
  restaurantId: string;
  currency: string;
  items: MenuItem[];
}

export interface CreateOrderRequest {
  restaurantId: string;
  fulfilmentType: 'PICKUP';
  items: { menuItemId: string; quantity: number }[];
}

export interface OrderLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineAmount: number;
}

export interface Order {
  id: string;
  status: string;
  restaurantId: string;
  fulfilmentType: string;
  currency: string;
  items: OrderLine[];
  subtotal: number;
  total: number;
  createdAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Owner view of a restaurant (DEC-015); `active` = visible to customers. */
export interface OwnedRestaurant {
  id: string;
  name: string;
  active: boolean;
}

/** Owner change to one dish: only the fields present are changed. */
export interface MenuItemChanges {
  available?: boolean;
  price?: number;
  description?: string;
  bestseller?: boolean;
  chefSpecial?: boolean;
}

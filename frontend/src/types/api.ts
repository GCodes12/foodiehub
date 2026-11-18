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
  /** When the status last changed (DEC-016); null/absent while the order is still as placed. */
  statusUpdatedAt?: string | null;
  /** SOLD_OUT, TOO_BUSY or CLOSING when the owner gave a reason for rejecting. */
  rejectReason?: string | null;
  /** Status changes, oldest first: only on a single order (GET /orders/{id}). */
  history?: StatusStep[];
}

export interface StatusStep {
  status: string;
  at: string;
  reason?: string | null;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'ACCEPTED' | 'REJECTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP';
export type RejectReason = 'SOLD_OUT' | 'TOO_BUSY' | 'CLOSING';

export interface StatusChangeRequest {
  /** The status the owner's screen shows; the server refuses the change if the order has moved on (409). */
  from: OrderStatus;
  status: OrderStatus;
  reason?: RejectReason;
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

// --- Platform administration (DEC-017) ---

/** One page of an administrator list. */
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Restaurant counts (restaurant_db) and people counts (Keycloak; null when the sign-in service can't be asked). */
export interface AdminDashboard {
  totalRestaurants: number;
  activeRestaurants: number;
  inactiveRestaurants: number;
  totalOwners: number | null;
  totalCustomers: number | null;
  userDirectoryAvailable: boolean;
  /** false when the server has no owner-provisioning client configured: owners can be assigned but not created. */
  ownerProvisioningConfigured: boolean;
}

/** `sub` is null for an assignment made before ownership moved to account ids: it grants nothing until re-assigned. */
export interface AdminOwnerLink {
  sub: string | null;
  username: string;
  assignedAt: string;
  needsReassignment: boolean;
}

export interface AdminRestaurantSummary {
  id: string;
  name: string;
  city: string | null;
  active: boolean;
  owner: AdminOwnerLink | null;
  dishes: number;
  availableDishes: number;
  updatedAt: string;
}

export interface AdminRestaurant extends AdminRestaurantSummary {
  description: string | null;
  address: string | null;
  phone: string | null;
  createdAt: string;
  version: number;
}

/** Editable restaurant details. On edit, only the fields present change; an empty string clears an optional field. */
export interface RestaurantDetailsInput {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface OwnerAccount {
  sub: string;
  username: string;
  displayName: string | null;
  /** Shown to administrators for owner accounts only (DEC-018). */
  email: string | null;
  enabled: boolean;
  /** The owner still has to replace the temporary password at first login. */
  passwordChangePending: boolean;
  restaurants: OwnedRestaurant[];
}

/** A new owner account (DEC-018). No role field: the server always creates a restaurant owner. */
export interface CreateOwnerInput {
  fullName: string;
  email: string;
  username: string;
  temporaryPassword: string;
}

export interface RestaurantActivity {
  restaurantId: string;
  orders: number;
  ordersToday: number;
  lastOrderAt: string | null;
}

export interface AdminOrderSummary {
  totalOrders: number;
  ordersToday: number;
  totalValue: number;
  valueToday: number;
  byStatus: Partial<Record<OrderStatus, number>>;
  restaurants: RestaurantActivity[];
  todayStartsAt: string;
  timeZone: string;
}

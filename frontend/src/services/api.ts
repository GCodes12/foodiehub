import type {
  AdminDashboard, AdminOrderSummary, AdminRestaurant, AdminRestaurantSummary, CreateOrderRequest, Diet, FieldError, Menu,
  MenuItem, MenuItemChanges, Order, OrderStatus, OwnedRestaurant, OwnerAccount, PageResponse, RestaurantDetailsInput,
  CreateOwnerInput,
  RestaurantSummary, StatusChangeRequest,
} from '../types/api.ts';
import { hasMessage, t } from '../utils/i18n.ts';

// HTTP client for the backend. Base URLs come from environment variables (see .env.example):
//   VITE_RESTAURANT_API_URL, VITE_ORDER_API_URL — empty (the default) = same origin, which in development is the
//   Vite dev proxy forwarding /api/v1/restaurants → :8081 and /api/v1/orders → :8082 (vite.config.ts).
// Pointing them at the services directly also works, but then each service must allow this origin (CORS).

/** A failed call. status 0 = the server could not be reached. code = the API's `code` property, when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: string | null;
  readonly fieldErrors: FieldError[];

  constructor(status: number, code: string | null, detail: string | null, fieldErrors: FieldError[] = []) {
    super(detail ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

/** Returns a currently valid access token, or null when the user is not signed in. */
export type TokenProvider = () => Promise<string | null>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ApiOptions {
  fetchImpl?: FetchLike;
  restaurantBaseUrl?: string;
  orderBaseUrl?: string;
  /** Called when an authenticated call gets 401 (expired or revoked session). */
  onUnauthorized?: () => void;
}

export function createApi(getToken: TokenProvider, options: ApiOptions = {}) {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const restaurantBase = trimTrailingSlashes(options.restaurantBaseUrl ?? '');
  const orderBase = trimTrailingSlashes(options.orderBaseUrl ?? '');

  async function call<T>(url: string, init: RequestInit, authenticated: boolean): Promise<{ body: T; response: Response }> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json, application/problem+json');
    if (authenticated) {
      const token = await getToken();
      if (!token) {
        throw new ApiError(401, 'SIGN_IN_REQUIRED', null);
      }
      headers.set('Authorization', `Bearer ${token}`);
    }
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, headers });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', null);
    }
    if (!response.ok) {
      if (authenticated && response.status === 401) {
        options.onUnauthorized?.();
      }
      throw await toApiError(response);
    }
    return { body: (await response.json()) as T, response };
  }

  const restaurants = `${restaurantBase}/api/v1/restaurants`;
  const orders = `${orderBase}/api/v1/orders`;
  const ownerRestaurants = `${restaurantBase}/api/v1/owner/restaurants`;
  const ownerOrders = `${orderBase}/api/v1/owner/orders`;
  const adminRestaurants = `${restaurantBase}/api/v1/admin/restaurants`;
  const adminOrders = `${orderBase}/api/v1/admin/orders`;

  function json(method: string, body: unknown): RequestInit {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  }

  return {
    async listRestaurants(): Promise<RestaurantSummary[]> {
      return (await call<RestaurantSummary[]>(restaurants, {}, false)).body;
    },

    async getRestaurant(id: string): Promise<RestaurantSummary> {
      return (await call<RestaurantSummary>(`${restaurants}/${encodeURIComponent(id)}`, {}, false)).body;
    },

    async getMenu(restaurantId: string): Promise<Menu> {
      const menu = (await call<Menu>(`${restaurants}/${encodeURIComponent(restaurantId)}/menu`, {}, false)).body;
      return { ...menu, items: (menu.items ?? []).map(normalizeItem) };
    },

    /** replayed = true when the server returned an order created earlier with the same Idempotency-Key. */
    async createOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<{ order: Order; replayed: boolean }> {
      const { body, response } = await call<Order>(orders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(request),
      }, true);
      return { order: body, replayed: response.headers.get('Idempotent-Replayed') === 'true' };
    },

    async getOrder(id: string): Promise<Order> {
      return (await call<Order>(`${orders}/${encodeURIComponent(id)}`, {}, true)).body;
    },

    /** The signed-in customer's own orders, newest first. */
    async listOrders(): Promise<Order[]> {
      return (await call<Order[]>(orders, {}, true)).body;
    },

    // --- Restaurant owners (DEC-015) ---

    async listOwnedRestaurants(): Promise<OwnedRestaurant[]> {
      return (await call<OwnedRestaurant[]>(ownerRestaurants, {}, true)).body;
    },

    async getOwnerMenu(restaurantId: string): Promise<Menu> {
      const menu = (await call<Menu>(`${ownerRestaurants}/${encodeURIComponent(restaurantId)}/menu`, {}, true)).body;
      return { ...menu, items: (menu.items ?? []).map(normalizeItem) };
    },

    async updateMenuItem(restaurantId: string, menuItemId: string, changes: MenuItemChanges): Promise<MenuItem> {
      const url = `${ownerRestaurants}/${encodeURIComponent(restaurantId)}/menu-items/${encodeURIComponent(menuItemId)}`;
      return normalizeItem((await call<MenuItem>(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      }, true)).body);
    },

    /** Orders at the owner's restaurants, newest first. */
    async listOwnerOrders(): Promise<Order[]> {
      return (await call<Order[]>(ownerOrders, {}, true)).body;
    },

    /** Moves an order along its lifecycle (DEC-016). */
    async updateOrderStatus(orderId: string, change: StatusChangeRequest): Promise<Order> {
      return (await call<Order>(`${ownerOrders}/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      }, true)).body;
    },

    // --- Platform administration (DEC-017): every call needs the ADMIN role; the services enforce it ---

    async getAdminDashboard(): Promise<AdminDashboard> {
      return (await call<AdminDashboard>(`${restaurantBase}/api/v1/admin/dashboard`, {}, true)).body;
    },

    async listAdminRestaurants(params: { page?: number; size?: number; active?: boolean; q?: string } = {}): Promise<PageResponse<AdminRestaurantSummary>> {
      return (await call<PageResponse<AdminRestaurantSummary>>(`${adminRestaurants}${query(params)}`, {}, true)).body;
    },

    async getAdminRestaurant(id: string): Promise<AdminRestaurant> {
      return (await call<AdminRestaurant>(`${adminRestaurants}/${encodeURIComponent(id)}`, {}, true)).body;
    },

    async createRestaurant(details: RestaurantDetailsInput): Promise<AdminRestaurant> {
      return (await call<AdminRestaurant>(adminRestaurants, json('POST', details), true)).body;
    },

    /** Only the fields present change. `expectedVersion` is the version the screen showed (409 if it changed since). */
    async updateRestaurant(id: string, expectedVersion: number, changes: RestaurantDetailsInput): Promise<AdminRestaurant> {
      return (await call<AdminRestaurant>(`${adminRestaurants}/${encodeURIComponent(id)}`,
        json('PATCH', { expectedVersion, ...changes }), true)).body;
    },

    async setRestaurantActive(id: string, active: boolean, expectedVersion: number): Promise<AdminRestaurant> {
      return (await call<AdminRestaurant>(`${adminRestaurants}/${encodeURIComponent(id)}/status`,
        json('PUT', { active, expectedVersion }), true)).body;
    },

    /** The server checks with Keycloak that this account is an enabled restaurant owner (422 INVALID_OWNER otherwise). */
    async assignRestaurantOwner(id: string, ownerSub: string): Promise<AdminRestaurant> {
      return (await call<AdminRestaurant>(`${adminRestaurants}/${encodeURIComponent(id)}/owner`,
        json('PUT', { ownerSub }), true)).body;
    },

    async listOwners(params: { page?: number; size?: number } = {}): Promise<PageResponse<OwnerAccount>> {
      return (await call<PageResponse<OwnerAccount>>(`${restaurantBase}/api/v1/admin/owners${query(params)}`, {}, true)).body;
    },

    /**
     * Creates a restaurant owner account in Keycloak (DEC-018). The response never contains the password. Assign a
     * restaurant afterwards with assignRestaurantOwner.
     */
    async createOwner(owner: CreateOwnerInput): Promise<OwnerAccount> {
      return (await call<OwnerAccount>(`${restaurantBase}/api/v1/admin/owners`, json('POST', owner), true)).body;
    },

    async listAdminOrders(params: { page?: number; size?: number; restaurantId?: string; status?: OrderStatus } = {}): Promise<PageResponse<Order>> {
      return (await call<PageResponse<Order>>(`${adminOrders}${query(params)}`, {}, true)).body;
    },

    async getAdminOrderSummary(): Promise<AdminOrderSummary> {
      return (await call<AdminOrderSummary>(`${adminOrders}/summary`, {}, true)).body;
    },
  };
}

/** "?a=1&b=x" from the defined, non-empty values (or "" when there are none). */
function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export type Api = ReturnType<typeof createApi>;

/** "http://host:8081///" → "http://host:8081". A loop instead of a regex: linear time for any input. */
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end--;
  }
  return value.slice(0, end);
}

const DIETS: readonly string[] = ['VEG', 'EGG', 'NON_VEG'];

/** Tolerates an older Restaurant Service without the DEC-014 fields: missing details get neutral defaults. */
function normalizeItem(raw: Partial<MenuItem> & Pick<MenuItem, 'id' | 'name' | 'price' | 'available'>): MenuItem {
  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    available: raw.available,
    category: typeof raw.category === 'string' && raw.category ? raw.category : 'OTHER',
    description: typeof raw.description === 'string' ? raw.description : null,
    diet: typeof raw.diet === 'string' && DIETS.includes(raw.diet) ? (raw.diet as Diet) : null,
    bestseller: raw.bestseller === true,
    chefSpecial: raw.chefSpecial === true,
    imageKey: typeof raw.imageKey === 'string' && raw.imageKey ? raw.imageKey : null,
  };
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await response.text());
    if (typeof parsed === 'object' && parsed !== null) {
      problem = parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON (for example a proxy error page): keep only the status.
  }
  const fieldErrors = Array.isArray(problem.errors)
    ? problem.errors.filter(
        (e): e is FieldError => typeof e === 'object' && e !== null && typeof e.field === 'string' && typeof e.message === 'string')
    : [];
  return new ApiError(
    response.status,
    typeof problem.code === 'string' ? problem.code : null,
    typeof problem.detail === 'string' ? problem.detail : null,
    fieldErrors);
}

/** A message for the user, from src/messages/en.json. Never includes tokens or internal details. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return t('errors.unknown');
  }
  if (error.code && hasMessage(`errors.${error.code}`)) {
    return t(`errors.${error.code}`);
  }
  if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404) {
    return t(`errors.status.${error.status}`);
  }
  return t('errors.status.default', { status: error.status });
}

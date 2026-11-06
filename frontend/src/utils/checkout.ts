import type { CreateOrderRequest } from '../types/api.ts';

// One Idempotency-Key per checkout attempt. Retrying the same cart (double click, timeout, 503, page reload)
// reuses the key, so the server returns the existing order instead of creating a second one. Changing the cart
// produces a new key, because the server rejects a reused key with a different request (409).

export interface KeyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'foodiehub.checkout';

/** Order-sensitive on purpose: it mirrors exactly what is sent to the server. */
export function requestFingerprint(request: CreateOrderRequest): string {
  return JSON.stringify([
    request.restaurantId,
    request.fulfilmentType,
    request.items.map((item) => [item.menuItemId, item.quantity]),
  ]);
}

export function idempotencyKeyFor(
  request: CreateOrderRequest,
  storage: KeyStorage,
  newKey: () => string = () => crypto.randomUUID(),
): string {
  const fingerprint = requestFingerprint(request);
  try {
    const stored: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (
      typeof stored === 'object' && stored !== null &&
      (stored as { fingerprint?: unknown }).fingerprint === fingerprint &&
      typeof (stored as { key?: unknown }).key === 'string'
    ) {
      return (stored as { key: string }).key;
    }
  } catch {
    // Corrupt entry: start a new attempt.
  }
  const key = newKey();
  storage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint, key }));
  return key;
}

/** Call after the order was created, or after a 409, so the next checkout starts a new attempt. */
export function forgetIdempotencyKey(storage: KeyStorage): void {
  storage.removeItem(STORAGE_KEY);
}

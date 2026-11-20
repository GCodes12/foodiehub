import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError, createApi, describeError } from './api.ts';
import { t } from '../utils/i18n.ts';

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(response: Response | Error) {
  const calls: Call[] = [];
  const impl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (response instanceof Error) {
      throw response;
    }
    return response;
  };
  return { impl, calls };
}

function problem(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });
}

const ORDER = {
  id: 'o-1', status: 'PENDING_PAYMENT', restaurantId: 'r1', fulfilmentType: 'PICKUP', currency: 'INR',
  items: [], subtotal: 458, total: 458, createdAt: '2026-11-06T06:13:20Z',
};
const REQUEST = { restaurantId: 'r1', fulfilmentType: 'PICKUP' as const, items: [{ menuItemId: 'dosa', quantity: 2 }] };

describe('api client', () => {
  it('sends the bearer token and the Idempotency-Key, and reports a replayed order', async () => {
    const fetch = fakeFetch(new Response(JSON.stringify(ORDER), {
      status: 201, headers: { 'Content-Type': 'application/json', 'Idempotent-Replayed': 'true' },
    }));
    const api = createApi(async () => 'token-123', { fetchImpl: fetch.impl });

    const result = await api.createOrder(REQUEST, 'key-abc-123');

    assert.equal(result.order.id, 'o-1');
    assert.equal(result.replayed, true);
    const { url, init } = fetch.calls[0];
    const headers = new Headers(init.headers);
    assert.equal(url, '/api/v1/orders');
    assert.equal(init.method, 'POST');
    assert.equal(headers.get('Authorization'), 'Bearer token-123');
    assert.equal(headers.get('Idempotency-Key'), 'key-abc-123');
    assert.equal(headers.get('Content-Type'), 'application/json');
    assert.deepEqual(JSON.parse(init.body as string), REQUEST);
  });

  it('does not call the server for an order when the user is not signed in', async () => {
    const fetch = fakeFetch(new Response('{}'));
    const api = createApi(async () => null, { fetchImpl: fetch.impl });
    await assert.rejects(api.getOrder('o-1'), (e: unknown) => e instanceof ApiError && e.status === 401);
    assert.equal(fetch.calls.length, 0);
  });

  it('sends no token for public restaurant calls', async () => {
    const fetch = fakeFetch(new Response('[]', { status: 200 }));
    let asked = false;
    const api = createApi(async () => { asked = true; return 'token'; }, { fetchImpl: fetch.impl });
    await api.listRestaurants();
    assert.equal(asked, false);
    assert.equal(new Headers(fetch.calls[0].init.headers).get('Authorization'), null);
  });

  it('turns Problem Details into an ApiError with the code and field errors', async () => {
    const fetch = fakeFetch(problem(400, {
      status: 400, detail: 'The order request is invalid.', code: 'VALIDATION_FAILED',
      errors: [{ field: 'items[0].quantity', message: 'must be less than or equal to 50' }],
    }));
    const api = createApi(async () => 't', { fetchImpl: fetch.impl });
    await assert.rejects(api.createOrder(REQUEST, 'key-abc-123'), (e: unknown) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.status, 400);
      assert.equal(e.code, 'VALIDATION_FAILED');
      assert.deepEqual(e.fieldErrors, [{ field: 'items[0].quantity', message: 'must be less than or equal to 50' }]);
      return true;
    });
  });

  it('reports an unreachable server as status 0', async () => {
    const api = createApi(async () => 't', { fetchImpl: fakeFetch(new TypeError('Failed to fetch')).impl });
    await assert.rejects(api.listRestaurants(), (e: unknown) => e instanceof ApiError && e.status === 0);
  });

  it('copes with a non-JSON error body (for example the dev proxy when a service is down)', async () => {
    const api = createApi(async () => 't', { fetchImpl: fakeFetch(new Response('Bad Gateway', { status: 502 })).impl });
    await assert.rejects(api.listRestaurants(), (e: unknown) => e instanceof ApiError && e.status === 502 && e.code === null);
  });
});

describe('api client — menu, order list, base URLs, expired sessions', () => {
  it('lists the customer\'s orders with the token', async () => {
    const fetch = fakeFetch(new Response(JSON.stringify([ORDER]), { status: 200 }));
    const api = createApi(async () => 'token-9', { fetchImpl: fetch.impl });
    const orders = await api.listOrders();
    assert.equal(orders[0].id, 'o-1');
    assert.equal(fetch.calls[0].url, '/api/v1/orders');
    assert.equal(new Headers(fetch.calls[0].init.headers).get('Authorization'), 'Bearer token-9');
  });

  it('uses the configured service base URLs', async () => {
    const urls: string[] = [];
    const api = createApi(async () => 't', { fetchImpl: async (url) => { urls.push(url); return new Response('[]'); }, restaurantBaseUrl: 'http://localhost:8081/', orderBaseUrl: 'http://localhost:8082' });
    await api.listRestaurants();
    await api.listOrders();
    assert.deepEqual(urls, ['http://localhost:8081/api/v1/restaurants', 'http://localhost:8082/api/v1/orders']);
  });

  it('removes any number of trailing slashes from the base URLs', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => { urls.push(url); return new Response('[]'); };
    await createApi(async () => 't', { fetchImpl, restaurantBaseUrl: 'http://localhost:8081///', orderBaseUrl: 'http://localhost:8082//' }).listOrders();
    await createApi(async () => 't', { fetchImpl, restaurantBaseUrl: 'http://localhost:8081///' }).listRestaurants();
    await createApi(async () => 't', { fetchImpl, restaurantBaseUrl: '///' }).listRestaurants();
    assert.deepEqual(urls, ['http://localhost:8082/api/v1/orders', 'http://localhost:8081/api/v1/restaurants', '/api/v1/restaurants']);
  });

  it('fills neutral defaults for menu items from an older Restaurant Service', async () => {
    const body = { restaurantId: 'r1', currency: 'INR', items: [
      { id: 'a', name: 'Plain', price: 10, available: true },
      { id: 'b', name: 'Full', price: 299, available: true, category: 'CHICKEN_BIRYANI', description: 'd', diet: 'NON_VEG',
        bestseller: true, chefSpecial: false, imageKey: 'k' },
      { id: 'c', name: 'Odd', price: 1, available: true, diet: 'SOMETHING' },
    ] };
    const api = createApi(async () => null, { fetchImpl: fakeFetch(new Response(JSON.stringify(body), { status: 200 })).impl });
    const menu = await api.getMenu('r1');
    assert.deepEqual(menu.items[0], { id: 'a', name: 'Plain', price: 10, available: true, category: 'OTHER', description: null,
      diet: null, bestseller: false, chefSpecial: false, imageKey: null });
    assert.equal(menu.items[1].diet, 'NON_VEG');
    assert.equal(menu.items[1].bestseller, true);
    assert.equal(menu.items[2].diet, null, 'unknown diet values are not trusted');
  });

  it('reports an expired session (401 on an authenticated call) once, and not for public calls', async () => {
    let expired = 0;
    const unauthorized = () => new Response('{}', { status: 401 });
    const api = createApi(async () => 'stale', { fetchImpl: async () => unauthorized(), onUnauthorized: () => { expired++; } });
    await assert.rejects(api.getOrder('o-1'), (e: unknown) => e instanceof ApiError && e.status === 401);
    await assert.rejects(api.listRestaurants());
    assert.equal(expired, 1);
  });
});

describe('api client — owner endpoints (DEC-015)', () => {
  it('lists owned restaurants, loads the owner menu and lists owner orders with the token', async () => {
    const urls: string[] = [];
    const auths: (string | null)[] = [];
    const bodies = [[{ id: 'r1', name: 'ZAYORA', active: true }], { restaurantId: 'r1', currency: 'INR', items: [] }, []];
    let i = 0;
    const api = createApi(async () => 'owner-token', { fetchImpl: async (url, init) => {
      urls.push(url);
      auths.push(new Headers(init.headers).get('Authorization'));
      return new Response(JSON.stringify(bodies[i++]));
    } });
    assert.equal((await api.listOwnedRestaurants())[0].name, 'ZAYORA');
    await api.getOwnerMenu('r1');
    await api.listOwnerOrders();
    assert.deepEqual(urls, ['/api/v1/owner/restaurants', '/api/v1/owner/restaurants/r1/menu', '/api/v1/owner/orders']);
    assert.ok(auths.every((a) => a === 'Bearer owner-token'));
  });

  it('sends only the changed fields when updating a dish', async () => {
    const fetch = fakeFetch(new Response(JSON.stringify({ id: 'm1', name: 'Phirni', price: 95, available: true })));
    const api = createApi(async () => 'owner-token', { fetchImpl: fetch.impl });
    const updated = await api.updateMenuItem('r1', 'm1', { available: true, price: 95 });
    assert.equal(updated.available, true);
    assert.equal(fetch.calls[0].url, '/api/v1/owner/restaurants/r1/menu-items/m1');
    assert.equal(fetch.calls[0].init.method, 'PATCH');
    assert.deepEqual(JSON.parse(fetch.calls[0].init.body as string), { available: true, price: 95 });
  });

  it('sends a status change with the expected current status', async () => {
    const fetch = fakeFetch(new Response(JSON.stringify({ ...ORDER, status: 'ACCEPTED' })));
    const api = createApi(async () => 'owner-token', { fetchImpl: fetch.impl });
    const updated = await api.updateOrderStatus('o-1', { from: 'PENDING_PAYMENT', status: 'ACCEPTED' });
    assert.equal(updated.status, 'ACCEPTED');
    assert.equal(fetch.calls[0].url, '/api/v1/owner/orders/o-1/status');
    assert.equal(fetch.calls[0].init.method, 'PATCH');
    assert.deepEqual(JSON.parse(fetch.calls[0].init.body as string), { from: 'PENDING_PAYMENT', status: 'ACCEPTED' });
  });

  it('explains a 403 from the server', async () => {
    const api = createApi(async () => 't', { fetchImpl: async () => problem(403, { status: 403, code: 'FORBIDDEN', detail: 'x' }) });
    await assert.rejects(api.listOwnerOrders(), (e: unknown) => e instanceof ApiError && describeError(e) === "Your account isn't allowed to do this.");
  });
});

describe('describeError', () => {
  it('explains each checkout outcome with the text from the messages file', () => {
    assert.equal(describeError(new ApiError(503, 'PRICING_UNAVAILABLE', 'server text')), t('errors.PRICING_UNAVAILABLE'));
    assert.match(describeError(new ApiError(503, 'PRICING_UNAVAILABLE', 'x')), /No order was placed/);
    assert.match(describeError(new ApiError(422, 'ITEM_UNAVAILABLE', 'x')), /no longer available/);
    assert.match(describeError(new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'x')), /place the order again/);
    assert.match(describeError(new ApiError(401, null, null)), /log in again/);
    assert.match(describeError(new ApiError(0, 'NETWORK_ERROR', null)), /Can't reach/);
    assert.match(describeError(new Error('boom')), /Something went wrong/);
  });

  it('falls back to a status message, never to raw server text, for an unknown code', () => {
    assert.equal(describeError(new ApiError(502, 'SOMETHING_NEW', 'internal detail')), t('errors.status.default', { status: 502 }));
    assert.equal(describeError(new ApiError(404, null, null)), t('errors.status.404'));
  });
});

describe('api client — platform administration (DEC-017)', () => {
  function recorder(bodies: unknown[]) {
    const calls: Call[] = [];
    let i = 0;
    const impl = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(bodies[i++] ?? {}), { status: 200 });
    };
    return { calls, impl };
  }

  it('reads the dashboard, restaurants, owners and platform orders with the token and query filters', async () => {
    const page = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 };
    const rec = recorder([{}, page, {}, page, page, {}]);
    const api = createApi(async () => 'admin-token', { fetchImpl: rec.impl });
    await api.getAdminDashboard();
    await api.listAdminRestaurants({ page: 2, size: 20, active: false, q: 'spice route' });
    await api.getAdminRestaurant('r 1');
    await api.listOwners({ size: 100 });
    await api.listAdminOrders({ status: 'PREPARING', restaurantId: undefined });
    await api.getAdminOrderSummary();
    assert.deepEqual(rec.calls.map((c) => c.url), [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/restaurants?page=2&size=20&active=false&q=spice+route',
      '/api/v1/admin/restaurants/r%201',
      '/api/v1/admin/owners?size=100',
      '/api/v1/admin/orders?status=PREPARING',
      '/api/v1/admin/orders/summary',
    ]);
    assert.ok(rec.calls.every((c) => new Headers(c.init.headers).get('Authorization') === 'Bearer admin-token'));
  });

  it('sends exactly the intended bodies for create, edit, status and owner changes', async () => {
    const rec = recorder([{}, {}, {}, {}]);
    const api = createApi(async () => 'admin-token', { fetchImpl: rec.impl });
    await api.createRestaurant({ name: 'Spice Route', city: 'Kochi' });
    await api.updateRestaurant('r1', 4, { city: '' });
    await api.setRestaurantActive('r1', false, 5);
    await api.assignRestaurantOwner('r1', 'sub-123');
    assert.deepEqual(rec.calls.map((c) => [c.init.method, c.url, JSON.parse(c.init.body as string)]), [
      ['POST', '/api/v1/admin/restaurants', { name: 'Spice Route', city: 'Kochi' }],
      ['PATCH', '/api/v1/admin/restaurants/r1', { expectedVersion: 4, city: '' }],
      ['PUT', '/api/v1/admin/restaurants/r1/status', { active: false, expectedVersion: 5 }],
      ['PUT', '/api/v1/admin/restaurants/r1/owner', { ownerSub: 'sub-123' }],
    ]);
  });

  it('never calls an admin endpoint without a session', async () => {
    const rec = recorder([]);
    const api = createApi(async () => null, { fetchImpl: rec.impl });
    await assert.rejects(api.getAdminDashboard(), (e: unknown) => e instanceof ApiError && e.status === 401);
    assert.equal(rec.calls.length, 0);
  });

  it('explains the admin error codes with the text from the messages file', () => {
    assert.match(describeError(new ApiError(422, 'INVALID_OWNER', 'x')), /restaurant owner role/);
    assert.match(describeError(new ApiError(409, 'RESTAURANT_HAS_NO_MENU', 'x')), /at least one available dish/);
    assert.match(describeError(new ApiError(409, 'RESTAURANT_CHANGED', 'x')), /Reload it/);
    assert.match(describeError(new ApiError(503, 'USER_DIRECTORY_UNAVAILABLE', 'x')), /sign-in service/);
    assert.match(describeError(new ApiError(403, 'FORBIDDEN', 'x')), /isn't allowed/);
  });
});

describe('api client — owner accounts (DEC-018)', () => {
  it('creates an owner with exactly the form fields and the admin token', async () => {
    const calls: Call[] = [];
    const api = createApi(async () => 'admin-token', { fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ sub: 's', username: 'asha.rao', displayName: 'Asha Rao', email: 'a@x.test', enabled: true,
        passwordChangePending: true, restaurants: [] }), { status: 201 });
    } });
    const owner = await api.createOwner({ fullName: 'Asha Rao', email: 'a@x.test', username: 'asha.rao', temporaryPassword: 'Kitchen-Start-42' });
    assert.equal(owner.passwordChangePending, true);
    assert.equal(calls[0].url, '/api/v1/admin/owners');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer admin-token');
    assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body as string)).sort(), ['email', 'fullName', 'temporaryPassword', 'username']);
  });

  it('explains duplicate and provisioning errors', () => {
    assert.match(describeError(new ApiError(409, 'OWNER_USERNAME_TAKEN', 'x')), /username is already taken/);
    assert.match(describeError(new ApiError(409, 'OWNER_EMAIL_TAKEN', 'x')), /e-mail address already exists/);
    assert.match(describeError(new ApiError(503, 'OWNER_PROVISIONING_UNAVAILABLE', 'x')), /No account was created/);
  });
});

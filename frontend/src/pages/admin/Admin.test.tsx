import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminOnly } from '../../App.tsx';
import { StatCards } from '../../components/admin/AdminParts.tsx';
import { Navbar } from '../../components/layout/Navbar.tsx';
import { ADMIN, ALICE, OWNER, render, SIGNED_OUT, text } from '../../test/render.tsx';
import type { AdminRestaurant, AdminRestaurantSummary, Order, OwnerAccount } from '../../types/api.ts';
import { dashboardCards } from '../../utils/admin.ts';
import { OrderTable } from './AdminOrdersPage.tsx';
import { OwnerCard, StatusCard } from './AdminRestaurantPage.tsx';
import { RestaurantTable } from './AdminRestaurantsPage.tsx';

const RESTAURANT: AdminRestaurant = {
  id: 'r1', name: 'Spice Route', description: null, address: null, city: 'Kochi', phone: null, active: true, owner: null,
  dishes: 3, availableDishes: 2, createdAt: '2026-11-18T08:00:00Z', updatedAt: '2026-11-18T08:00:00Z', version: 1,
};
const noop = () => {};

describe('admin access in the UI (DEC-017)', () => {
  const page = <AdminOnly><p>admin content</p></AdminOnly>;

  it('shows administrator pages to ADMIN only', () => {
    assert.match(render(page, { auth: ADMIN }), /admin content/);
    for (const auth of [OWNER, ALICE]) {
      const html = text(render(page, { auth }));
      assert.doesNotMatch(html, /admin content/);
      assert.match(html, /For platform administrators/);
    }
    const signedOut = text(render(page, { auth: SIGNED_OUT }));
    assert.doesNotMatch(signedOut, /admin content/);
    assert.match(signedOut, /Please log in/);
  });

  it('shows the Admin link to administrators only', () => {
    assert.match(text(render(<Navbar />, { auth: ADMIN })), /\bAdmin\b/);
    for (const auth of [OWNER, ALICE, SIGNED_OUT]) {
      assert.doesNotMatch(text(render(<Navbar />, { auth })), /\bAdmin\b/);
    }
  });
});

describe('admin dashboard cards', () => {
  it('shows the backend figures, and a dash for anything unavailable', () => {
    const html = render(<StatCards cards={dashboardCards({
      totalRestaurants: 4, activeRestaurants: 3, inactiveRestaurants: 1, totalOwners: null, totalCustomers: null,
      userDirectoryAvailable: false, ownerProvisioningConfigured: true,
    }, { totalOrders: 1250, ordersToday: 9, totalValue: 0, valueToday: 0, byStatus: {}, restaurants: [], todayStartsAt: '', timeZone: 'Asia/Kolkata' })} />);
    assert.match(html, /data-testid="stat-totalRestaurants">4</);
    assert.match(html, /data-testid="stat-totalOrders">1,250</);
    assert.match(html, /data-testid="stat-totalCustomers">—</);
    assert.match(text(html), /Restaurant owners.*Customers.*Orders today/);
  });
});

describe('restaurant list', () => {
  const summary = (over: Partial<AdminRestaurantSummary>): AdminRestaurantSummary => ({
    id: 'r1', name: 'Spice Route', city: 'Kochi', active: true, owner: null, dishes: 3, availableDishes: 2,
    updatedAt: '2026-11-18T08:00:00Z', ...over,
  });

  it('lists restaurants with status, owner and menu, and flags links that need re-assigning', () => {
    const page = text(render(<RestaurantTable restaurants={[
      summary({}),
      summary({ id: 'r2', name: 'ZAYORA', active: false, owner: { sub: null, username: 'owner', assignedAt: '', needsReassignment: true } }),
      summary({ id: 'r3', name: 'Tandoor', owner: { sub: 's', username: 'zara', assignedAt: '', needsReassignment: false } }),
    ]} />));
    assert.match(page, /Spice Route Kochi Active No owner 2 of 3 available/);
    assert.match(page, /ZAYORA Kochi Inactive Re-assign/);
    assert.match(page, /Tandoor Kochi Active zara/);
  });

  it('has an empty state', () => {
    assert.match(text(render(<RestaurantTable restaurants={[]} />)), /No restaurants found/);
  });
});

describe('restaurant status', () => {
  it('offers deactivation for an active restaurant (confirmed in a dialog before anything changes)', () => {
    const html = render(<StatusCard restaurant={RESTAURANT} onChanged={noop} onStale={noop} />);
    assert.match(text(html), /Customers can see this restaurant/);
    assert.match(html, /btn-danger[^>]*>Deactivate</);
    assert.doesNotMatch(html, /role="dialog"/, 'the confirmation only opens on click');
  });

  it('cannot activate a restaurant without an available dish', () => {
    const html = render(<StatusCard restaurant={{ ...RESTAURANT, active: false, availableDishes: 0 }} onChanged={noop} onStale={noop} />);
    assert.match(text(html), /no available dish yet/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>Activate restaurant</);
  });
});

describe('owner assignment', () => {
  const owners: OwnerAccount[] = [
    { sub: 's-owner', username: 'owner', displayName: 'Owner Demo', email: 'owner@x.test', enabled: true, passwordChangePending: false,
      restaurants: [{ id: 'z', name: 'ZAYORA', active: true }] },
    { sub: 's-off', username: 'disabled', displayName: null, email: null, enabled: false, passwordChangePending: false, restaurants: [] },
  ];

  it('offers only enabled owner accounts, with what they already manage', () => {
    const html = render(<OwnerCard restaurant={RESTAURANT} onChanged={noop} initialOwners={owners} />);
    assert.match(text(html), /Owner Demo \(owner\) — ZAYORA/);
    assert.doesNotMatch(html, /s-off/);
    assert.match(text(html), /No owner is assigned yet/);
    assert.match(text(html), /Roles are granted in the Keycloak admin console, never here/);
  });

  it('asks to re-assign a link made by username', () => {
    const legacy = { ...RESTAURANT, owner: { sub: null, username: 'owner', assignedAt: '', needsReassignment: true } };
    assert.match(text(render(<OwnerCard restaurant={legacy} onChanged={noop} initialOwners={owners} />)),
      /owner was linked by username .* Assign the owner again/);
  });

  it('explains when no account has the owner role', () => {
    assert.match(text(render(<OwnerCard restaurant={RESTAURANT} onChanged={noop} initialOwners={[]} />)),
      /No enabled accounts have the restaurant owner role yet/);
  });
});

describe('platform orders', () => {
  const order: Order = {
    id: 'abcdef12-0000', status: 'PREPARING', restaurantId: 'r1', fulfilmentType: 'PICKUP', currency: 'INR', subtotal: 598, total: 598,
    createdAt: '2026-11-18T08:00:00Z', items: [{ menuItemId: 'm', name: 'Biryani', unitPrice: 299, quantity: 2, lineAmount: 598 }],
  };

  it('shows each order with its restaurant name, status, item count and total', () => {
    const page = text(render(<OrderTable orders={[order, { ...order, id: 'ffff0000-1', restaurantId: 'unknown' }]}
      restaurants={[{ ...RESTAURANT }]} />));
    assert.match(page, /ABCDEF12 Spice Route Preparing 2 ₹598\.00/);
    assert.match(page, /FFFF0000 unknown/);
  });

  it('has an empty state', () => {
    assert.match(text(render(<OrderTable orders={[]} restaurants={[]} />)), /No orders found/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AdminDashboard, AdminOrderSummary, AdminRestaurant } from '../types/api.ts';
import {
  activityRows, dashboardCards, emptyRestaurantForm, formFromRestaurant, ownerLabel, restaurantChanges, toCreateRequest,
  validateRestaurantForm,
} from './admin.ts';

const RESTAURANT: AdminRestaurant = {
  id: 'r1', name: 'Spice Route', description: 'Kerala food', address: '1 MG Road', city: 'Kochi', phone: null, active: false,
  owner: null, dishes: 0, availableDishes: 0, createdAt: '2026-11-18T08:00:00Z', updatedAt: '2026-11-18T08:00:00Z', version: 3,
};

describe('restaurant form (DEC-017)', () => {
  it('requires a name and checks lengths and the phone like the server', () => {
    assert.deepEqual(validateRestaurantForm({ ...emptyRestaurantForm(), name: 'Spice Route', phone: '+91 (484) 000-000' }), {});
    assert.equal(validateRestaurantForm(emptyRestaurantForm()).name, 'admin.form.errors.nameRequired');
    assert.equal(validateRestaurantForm({ ...emptyRestaurantForm(), name: '   ' }).name, 'admin.form.errors.nameRequired');
    assert.equal(validateRestaurantForm({ ...emptyRestaurantForm(), name: 'x'.repeat(201) }).name, 'admin.form.errors.tooLong');
    assert.equal(validateRestaurantForm({ ...emptyRestaurantForm(), name: 'A', description: 'd'.repeat(501) }).description,
      'admin.form.errors.tooLong');
    assert.equal(validateRestaurantForm({ ...emptyRestaurantForm(), name: 'A', phone: 'call me' }).phone, 'admin.form.errors.phone');
    assert.equal(validateRestaurantForm({ ...emptyRestaurantForm(), name: 'A', phone: '123' }).phone, 'admin.form.errors.phone');
  });

  it('creates from trimmed values and leaves empty optional fields out (no other fields can be sent)', () => {
    assert.deepEqual(toCreateRequest({ name: '  Spice Route ', description: '', address: ' 1 MG Road ', city: '', phone: '' }),
      { name: 'Spice Route', address: '1 MG Road' });
  });

  it('sends only what changed when editing, and "" to clear an optional field', () => {
    const form = formFromRestaurant(RESTAURANT);
    assert.deepEqual(restaurantChanges(RESTAURANT, form), {});
    assert.deepEqual(restaurantChanges(RESTAURANT, { ...form, city: '  Kochi  ' }), {}, 'whitespace alone is no change');
    assert.deepEqual(restaurantChanges(RESTAURANT, { ...form, name: 'Spice Route II', description: '' }),
      { name: 'Spice Route II', description: '' });
    assert.deepEqual(restaurantChanges(RESTAURANT, { ...form, phone: '0484 000000' }), { phone: '0484 000000' });
  });
});

describe('admin dashboard figures', () => {
  const dashboard: AdminDashboard = {
    totalRestaurants: 4, activeRestaurants: 3, inactiveRestaurants: 1, totalOwners: 2, totalCustomers: 57, userDirectoryAvailable: true,
    ownerProvisioningConfigured: true,
  };
  const orders: AdminOrderSummary = {
    totalOrders: 120, ordersToday: 9, totalValue: 35000, valueToday: 2400, byStatus: { PENDING_PAYMENT: 2 },
    restaurants: [{ restaurantId: 'r1', orders: 100, ordersToday: 9, lastOrderAt: '2026-11-18T08:00:00Z' },
      { restaurantId: 'gone', orders: 20, ordersToday: 0, lastOrderAt: null }],
    todayStartsAt: '2026-11-17T18:30:00Z', timeZone: 'Asia/Kolkata',
  };

  it('builds the seven cards from the two services, in order', () => {
    assert.deepEqual(dashboardCards(dashboard, orders).map((c) => [c.key, c.value]), [
      ['totalRestaurants', 4], ['activeRestaurants', 3], ['inactiveRestaurants', 1], ['totalOwners', 2], ['totalCustomers', 57],
      ['totalOrders', 120], ['ordersToday', 9],
    ]);
  });

  it('never invents a number: unavailable figures are null', () => {
    const noPeople = { ...dashboard, totalOwners: null, totalCustomers: null, userDirectoryAvailable: false };
    const cards = dashboardCards(noPeople, null);
    assert.equal(cards.find((c) => c.key === 'totalCustomers')?.value, null);
    assert.equal(cards.find((c) => c.key === 'totalOrders')?.value, null);
    assert.equal(cards.find((c) => c.key === 'totalRestaurants')?.value, 4);
    assert.ok(dashboardCards(null, null).every((c) => c.value === null));
  });

  it('names restaurant activity and keeps unknown restaurants by id', () => {
    const rows = activityRows(orders.restaurants, [{ ...RESTAURANT, active: true }]);
    assert.deepEqual(rows.map((r) => [r.name, r.active, r.orders]), [['Spice Route', true, 100], ['gone', null, 20]]);
  });

  it('labels owner accounts', () => {
    assert.equal(ownerLabel({ username: 'owner', displayName: 'Owner Demo' }), 'Owner Demo (owner)');
    assert.equal(ownerLabel({ username: 'zara', displayName: null }), 'zara');
  });
});

describe('owner form (DEC-018)', () => {
  const valid = { fullName: 'Asha Rao', email: 'Asha@Example.com', username: 'asha.rao', temporaryPassword: 'Kitchen-Start-42' };

  it('accepts a valid owner and normalises it like the server', async () => {
    const { normaliseOwner, validateOwnerForm } = await import('./admin.ts');
    assert.deepEqual(validateOwnerForm(valid), {});
    assert.deepEqual(normaliseOwner({ ...valid, fullName: '  Asha Rao ', username: ' Asha.Rao ' }),
      { fullName: 'Asha Rao', email: 'asha@example.com', username: 'asha.rao', temporaryPassword: 'Kitchen-Start-42' });
  });

  it('requires every field and checks formats, length and the password rules', async () => {
    const { emptyOwnerForm, validateOwnerForm } = await import('./admin.ts');
    assert.deepEqual(validateOwnerForm(emptyOwnerForm()), {
      fullName: 'admin.ownerForm.errors.fullNameRequired', email: 'admin.ownerForm.errors.emailRequired',
      username: 'admin.ownerForm.errors.usernameRequired', temporaryPassword: 'admin.ownerForm.errors.passwordRequired',
    });
    assert.equal(validateOwnerForm({ ...valid, email: 'not-an-email' }).email, 'admin.ownerForm.errors.email');
    for (const username of ['ab', 'has space', '-start', 'service-account-x', 'x'.repeat(51)]) {
      assert.equal(validateOwnerForm({ ...valid, username }).username, 'admin.ownerForm.errors.username', username);
    }
    assert.equal(validateOwnerForm({ ...valid, temporaryPassword: 'short' }).temporaryPassword, 'admin.ownerForm.errors.passwordLength');
    assert.equal(validateOwnerForm({ ...valid, temporaryPassword: 'x'.repeat(65) }).temporaryPassword, 'admin.ownerForm.errors.passwordLength');
    assert.equal(validateOwnerForm({ ...valid, temporaryPassword: 'my-ASHA.RAO-key' }).temporaryPassword, 'admin.ownerForm.errors.passwordUsername');
    assert.equal(validateOwnerForm({ ...valid, fullName: 'x'.repeat(101) }).fullName, 'admin.form.errors.tooLong');
  });

  it('maps duplicate conflicts to their field and derives the account status', async () => {
    const { ownerConflictField, ownerStatus } = await import('./admin.ts');
    assert.equal(ownerConflictField('OWNER_USERNAME_TAKEN'), 'username');
    assert.equal(ownerConflictField('OWNER_EMAIL_TAKEN'), 'email');
    assert.equal(ownerConflictField('OWNER_PROVISIONING_UNAVAILABLE'), null);
    assert.equal(ownerStatus({ enabled: true, passwordChangePending: false }), 'active');
    assert.equal(ownerStatus({ enabled: true, passwordChangePending: true }), 'passwordPending');
    assert.equal(ownerStatus({ enabled: false, passwordChangePending: true }), 'disabled');
  });
});

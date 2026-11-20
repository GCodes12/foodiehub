import type {
  AdminDashboard, AdminOrderSummary, AdminRestaurant, AdminRestaurantSummary, CreateOwnerInput, OwnerAccount,
  RestaurantActivity, RestaurantDetailsInput,
} from '../types/api.ts';

// Administrator screens (DEC-017): form checks matching the Restaurant Service rules, edit diffs, and the dashboard
// figures. The server checks everything again; nothing here grants access.

export interface RestaurantForm {
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
}

export type RestaurantFormErrors = Partial<Record<keyof RestaurantForm, string>>;

export const RESTAURANT_LIMITS = { name: 200, description: 500, address: 300, city: 100 } as const;
const PHONE = /^[0-9+()\- ]{6,20}$/;

export function emptyRestaurantForm(): RestaurantForm {
  return { name: '', description: '', address: '', city: '', phone: '' };
}

export function formFromRestaurant(r: AdminRestaurant): RestaurantForm {
  return { name: r.name, description: r.description ?? '', address: r.address ?? '', city: r.city ?? '', phone: r.phone ?? '' };
}

/** Message keys (src/messages/en.json) per field; empty when the form is valid. */
export function validateRestaurantForm(form: RestaurantForm): RestaurantFormErrors {
  const errors: RestaurantFormErrors = {};
  if (!form.name.trim()) {
    errors.name = 'admin.form.errors.nameRequired';
  } else if (form.name.trim().length > RESTAURANT_LIMITS.name) {
    errors.name = 'admin.form.errors.tooLong';
  }
  for (const field of ['description', 'address', 'city'] as const) {
    if (form[field].trim().length > RESTAURANT_LIMITS[field]) {
      errors[field] = 'admin.form.errors.tooLong';
    }
  }
  if (form.phone.trim() && !PHONE.test(form.phone.trim())) {
    errors.phone = 'admin.form.errors.phone';
  }
  return errors;
}

/** The create body: trimmed values, empty optional fields left out. */
export function toCreateRequest(form: RestaurantForm): RestaurantDetailsInput {
  const request: RestaurantDetailsInput = { name: form.name.trim() };
  for (const field of ['description', 'address', 'city', 'phone'] as const) {
    const value = form[field].trim();
    if (value) {
      request[field] = value;
    }
  }
  return request;
}

/** Only what changed (an emptied optional field is sent as "" so the server clears it). */
export function restaurantChanges(original: AdminRestaurant, form: RestaurantForm): RestaurantDetailsInput {
  const before = formFromRestaurant(original);
  const changes: RestaurantDetailsInput = {};
  for (const field of ['name', 'description', 'address', 'city', 'phone'] as const) {
    const value = form[field].trim();
    if (value !== before[field].trim()) {
      changes[field] = value;
    }
  }
  return changes;
}

export interface StatCard {
  key: string;
  label: string;
  /** null = not available right now (shown as a dash). */
  value: number | null;
}

/** The seven summary cards, from the Restaurant Service dashboard and the Order Service summary. */
export function dashboardCards(dashboard: AdminDashboard | null, orders: AdminOrderSummary | null): StatCard[] {
  return [
    { key: 'totalRestaurants', label: 'admin.cards.totalRestaurants', value: dashboard?.totalRestaurants ?? null },
    { key: 'activeRestaurants', label: 'admin.cards.activeRestaurants', value: dashboard?.activeRestaurants ?? null },
    { key: 'inactiveRestaurants', label: 'admin.cards.inactiveRestaurants', value: dashboard?.inactiveRestaurants ?? null },
    { key: 'totalOwners', label: 'admin.cards.totalOwners', value: dashboard?.totalOwners ?? null },
    { key: 'totalCustomers', label: 'admin.cards.totalCustomers', value: dashboard?.totalCustomers ?? null },
    { key: 'totalOrders', label: 'admin.cards.totalOrders', value: orders?.totalOrders ?? null },
    { key: 'ordersToday', label: 'admin.cards.ordersToday', value: orders?.ordersToday ?? null },
  ];
}

export interface ActivityRow extends RestaurantActivity {
  name: string;
  active: boolean | null;
}

/** Restaurant activity with names. Orders for a restaurant the admin list doesn't know keep their id as the name. */
export function activityRows(activity: RestaurantActivity[], restaurants: AdminRestaurantSummary[]): ActivityRow[] {
  const byId = new Map(restaurants.map((r) => [r.id, r] as const));
  return activity.map((a) => {
    const r = byId.get(a.restaurantId);
    return { ...a, name: r?.name ?? a.restaurantId, active: r ? r.active : null };
  });
}

/** Display name for an owner account: "Owner Demo (owner)", or just the username. */
export function ownerLabel(owner: { username: string; displayName?: string | null }): string {
  return owner.displayName ? `${owner.displayName} (${owner.username})` : owner.username;
}

// --- Owner accounts (DEC-018) ---

export type OwnerFormErrors = Partial<Record<keyof CreateOwnerInput, string>>;

export const OWNER_LIMITS = { fullName: 100, email: 254, passwordMin: 10, passwordMax: 64 } as const;
const USERNAME = /^(?!service-account-)[a-z0-9][a-z0-9._-]{2,49}$/;
// Local part, then a domain of dot-separated labels (no empty label: rejects "a@b..c", "a@.b.c" and a trailing dot).
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function emptyOwnerForm(): CreateOwnerInput {
  return { fullName: '', email: '', username: '', temporaryPassword: '' };
}

/** The values the server receives: trimmed, username and e-mail in lower case. The password is sent as typed. */
export function normaliseOwner(form: CreateOwnerInput): CreateOwnerInput {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    username: form.username.trim().toLowerCase(),
    temporaryPassword: form.temporaryPassword,
  };
}

/** Message keys per field, matching the Restaurant Service rules; empty when the form is valid. */
export function validateOwnerForm(form: CreateOwnerInput): OwnerFormErrors {
  const owner = normaliseOwner(form);
  const errors: OwnerFormErrors = {};
  if (!owner.fullName) {
    errors.fullName = 'admin.ownerForm.errors.fullNameRequired';
  } else if (owner.fullName.length > OWNER_LIMITS.fullName) {
    errors.fullName = 'admin.form.errors.tooLong';
  }
  if (!owner.email) {
    errors.email = 'admin.ownerForm.errors.emailRequired';
  } else if (owner.email.length > OWNER_LIMITS.email || !EMAIL.test(owner.email)) {
    errors.email = 'admin.ownerForm.errors.email';
  }
  if (!owner.username) {
    errors.username = 'admin.ownerForm.errors.usernameRequired';
  } else if (!USERNAME.test(owner.username)) {
    errors.username = 'admin.ownerForm.errors.username';
  }
  const password = owner.temporaryPassword;
  if (!password) {
    errors.temporaryPassword = 'admin.ownerForm.errors.passwordRequired';
  } else if (password.length < OWNER_LIMITS.passwordMin || password.length > OWNER_LIMITS.passwordMax) {
    errors.temporaryPassword = 'admin.ownerForm.errors.passwordLength';
  } else if (owner.username && password.toLowerCase().includes(owner.username)) {
    errors.temporaryPassword = 'admin.ownerForm.errors.passwordUsername';
  }
  return errors;
}

/** Server conflicts shown on the field they concern. */
export function ownerConflictField(code: string | null): keyof CreateOwnerInput | null {
  return code === 'OWNER_USERNAME_TAKEN' ? 'username' : code === 'OWNER_EMAIL_TAKEN' ? 'email' : null;
}

export type OwnerStatus = 'active' | 'disabled' | 'passwordPending';

export function ownerStatus(owner: Pick<OwnerAccount, 'enabled' | 'passwordChangePending'>): OwnerStatus {
  return !owner.enabled ? 'disabled' : owner.passwordChangePending ? 'passwordPending' : 'active';
}


import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Power, Store, TriangleAlert, UserCheck } from 'lucide-react';
import { ActiveBadge, AdminPage } from '../../components/admin/AdminParts.tsx';
import { RestaurantFormFields } from '../../components/admin/RestaurantFormFields.tsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorMessage } from '../../components/common/ErrorMessage.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useToast } from '../../components/common/Toast.tsx';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { ApiError } from '../../services/api.ts';
import { api } from '../../services/client.ts';
import type { AdminRestaurant, OwnerAccount } from '../../types/api.ts';
import {
  emptyRestaurantForm, formFromRestaurant, ownerLabel, restaurantChanges, toCreateRequest, validateRestaurantForm,
} from '../../utils/admin.ts';
import type { RestaurantForm, RestaurantFormErrors } from '../../utils/admin.ts';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';

/** Create a restaurant (DEC-017). It always starts inactive; owner and activation come next, on its own page. */
export function AdminNewRestaurantPage() {
  usePageMeta(t('admin.restaurant.newTitle'));
  const [form, setForm] = useState<RestaurantForm>(emptyRestaurantForm());
  const [errors, setErrors] = useState<RestaurantFormErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function submit() {
    const found = validateRestaurantForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.createRestaurant(toCreateRequest(form));
      toast(t('admin.restaurant.created', { name: created.name }));
      void navigate(paths.adminRestaurant(created.id), { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage title={t('admin.restaurant.newTitle')}>
      <section className="card">
        <p className="muted">{t('admin.restaurant.newHint')}</p>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
          <RestaurantFormFields form={form} errors={errors} onChange={setForm} idPrefix="new" />
          {error !== null && <ErrorMessage error={error} />}
          <div className="owner-dish-actions">
            <Link to={paths.adminRestaurants()} className="btn btn-ghost btn-sm">{t('kitchen.cancel')}</Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy} aria-busy={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}{t('admin.restaurant.create')}
            </button>
          </div>
        </form>
      </section>
    </AdminPage>
  );
}

/** One restaurant (DEC-017): edit details, activate / deactivate, assign or re-assign the owner. */
export function AdminRestaurantPage() {
  const { restaurantId = '' } = useParams();
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  usePageMeta(restaurant?.name ?? t('admin.restaurant.title'));

  useEffect(() => {
    let active = true;
    setError(null);
    api.getAdminRestaurant(restaurantId).then((r) => active && setRestaurant(r), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [restaurantId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <AdminPage title={t('admin.restaurant.title')}>
        <EmptyState icon={Store} title={t('admin.restaurant.notFoundTitle')} text={t('admin.restaurant.notFoundText')}>
          <Link to={paths.adminRestaurants()} className="btn btn-secondary"><ArrowLeft size={16} aria-hidden="true" /> {t('admin.restaurant.back')}</Link>
        </EmptyState>
      </AdminPage>
    );
  }

  return (
    <AdminPage title={restaurant?.name ?? t('admin.restaurant.title')} actions={restaurant && <ActiveBadge active={restaurant.active} />}>
      <Link to={paths.adminRestaurants()} className="link-arrow"><ArrowLeft size={15} aria-hidden="true" /> {t('admin.restaurant.back')}</Link>
      {error !== null && <ErrorMessage error={error} onRetry={reload} />}
      {restaurant === null && error === null && <Skeleton className="skeleton-block" />}
      {restaurant && (
        <div className="admin-columns">
          <DetailsCard key={`details-${restaurant.version}`} restaurant={restaurant} onSaved={setRestaurant} onStale={reload} />
          <div className="admin-stack">
            <StatusCard restaurant={restaurant} onChanged={setRestaurant} onStale={reload} />
            <OwnerCard restaurant={restaurant} onChanged={setRestaurant} />
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function DetailsCard({ restaurant, onSaved, onStale }: {
  restaurant: AdminRestaurant; onSaved: (r: AdminRestaurant) => void; onStale: () => void;
}) {
  const [form, setForm] = useState<RestaurantForm>(formFromRestaurant(restaurant));
  const [errors, setErrors] = useState<RestaurantFormErrors>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const changes = restaurantChanges(restaurant, form);
  const dirty = Object.keys(changes).length > 0;

  async function save() {
    const found = validateRestaurantForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || !dirty) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await api.updateRestaurant(restaurant.id, restaurant.version, changes);
      toast(t('admin.restaurant.saved', { name: saved.name }));
      onSaved(saved);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="details-title">
      <h2 id="details-title" className="card-title">{t('admin.restaurant.details')}</h2>
      <form onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
        <RestaurantFormFields form={form} errors={errors} onChange={setForm} idPrefix="edit" />
        {error !== null && <ErrorMessage error={error} onRetry={error instanceof ApiError && error.code === 'RESTAURANT_CHANGED' ? onStale : undefined} />}
        <div className="owner-dish-actions">
          <button type="button" className="btn btn-ghost btn-sm" disabled={!dirty || busy}
            onClick={() => { setForm(formFromRestaurant(restaurant)); setErrors({}); }}>{t('kitchen.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || busy} aria-busy={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}{t('kitchen.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

/** Exported for tests. Deactivation asks first; activation needs at least one available dish (the server checks). */
export function StatusCard({ restaurant, onChanged, onStale }: {
  restaurant: AdminRestaurant; onChanged: (r: AdminRestaurant) => void; onStale: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const noMenu = restaurant.availableDishes === 0;

  async function change(active: boolean) {
    setConfirming(false);
    setBusy(true);
    setError(null);
    try {
      const updated = await api.setRestaurantActive(restaurant.id, active, restaurant.version);
      toast(t(active ? 'admin.restaurant.activated' : 'admin.restaurant.deactivated', { name: updated.name }));
      onChanged(updated);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="status-title">
      <h2 id="status-title" className="card-title"><Power size={18} aria-hidden="true" /> {t('admin.restaurant.visibility')}</h2>
      <p className="muted">{t(restaurant.active ? 'admin.restaurant.activeText' : 'admin.restaurant.inactiveText')}</p>
      <p className="small">{t('admin.table.dishCount', { available: restaurant.availableDishes, total: restaurant.dishes })}</p>
      {!restaurant.active && noMenu && <p className="notice">{t('admin.restaurant.noMenuHint')}</p>}
      {error !== null && <ErrorMessage error={error} onRetry={error instanceof ApiError && error.code === 'RESTAURANT_CHANGED' ? onStale : undefined} />}
      {restaurant.active ? (
        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirming(true)}>
          {t('admin.restaurant.deactivate')}
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || noMenu} onClick={() => void change(true)}>
          {t('admin.restaurant.activate')}
        </button>
      )}
      <ConfirmDialog open={confirming} title={t('admin.restaurant.confirmTitle', { name: restaurant.name })}
        text={t('admin.restaurant.confirmText')} confirmLabel={t('admin.restaurant.deactivate')} cancelLabel={t('kitchen.reject.keep')}
        onConfirm={() => void change(false)} onCancel={() => setConfirming(false)} />
    </section>
  );
}

/** Exported for tests. Only accounts that already hold the owner role in Keycloak are offered; the server re-checks. */
export function OwnerCard({ restaurant, onChanged, initialOwners = null }: {
  restaurant: AdminRestaurant; onChanged: (r: AdminRestaurant) => void; initialOwners?: OwnerAccount[] | null;
}) {
  const [owners, setOwners] = useState<OwnerAccount[] | null>(initialOwners);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [selected, setSelected] = useState(restaurant.owner?.sub ?? '');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const selectId = useId();

  useEffect(() => {
    if (initialOwners) {
      return;
    }
    let active = true;
    api.listOwners({ size: 100 }).then((page) => active && setOwners(page.items), (e: unknown) => active && setLoadError(e));
    return () => {
      active = false;
    };
  }, [initialOwners]);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.assignRestaurantOwner(restaurant.id, selected);
      toast(t('admin.owner.assigned', { owner: updated.owner?.username ?? '', name: updated.name }));
      onChanged(updated);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const current = restaurant.owner;
  const enabledOwners = owners?.filter((o) => o.enabled) ?? [];
  return (
    <section className="card" aria-labelledby="owner-title">
      <h2 id="owner-title" className="card-title"><UserCheck size={18} aria-hidden="true" /> {t('admin.owner.title')}</h2>
      {!current && <p className="muted">{t('admin.owner.noneText')}</p>}
      {current && !current.needsReassignment && <p>{t('admin.owner.current', { owner: current.username })}</p>}
      {current?.needsReassignment && (
        <p className="notice" role="status"><TriangleAlert size={15} aria-hidden="true" /> {t('admin.owner.needsReassignment', { owner: current.username })}</p>
      )}
      {loadError !== null && <ErrorMessage error={loadError} />}
      {owners === null && loadError === null && <Skeleton className="skeleton-line skeleton-w70" />}
      {owners !== null && enabledOwners.length === 0 && <p className="muted">{t('admin.owner.noAccounts')}</p>}
      {enabledOwners.length > 0 && (
        <div className="admin-owner-pick">
          <label className="field" htmlFor={selectId}>
            <span className="field-label">{t('admin.owner.choose')}</span>
            <select id={selectId} className="select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{t('admin.owner.placeholder')}</option>
              {enabledOwners.map((o) => (
                <option key={o.sub} value={o.sub}>
                  {ownerLabel(o)}{o.restaurants.length > 0 ? ` — ${o.restaurants.map((r) => r.name).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !selected || selected === current?.sub}
            onClick={() => void assign()}>
            {busy && <span className="spinner" aria-hidden="true" />}{t(current ? 'admin.owner.reassign' : 'admin.owner.assign')}
          </button>
        </div>
      )}
      {error !== null && <ErrorMessage error={error} />}
      <p className="muted small">{t('admin.owner.roleHint')}</p>
    </section>
  );
}

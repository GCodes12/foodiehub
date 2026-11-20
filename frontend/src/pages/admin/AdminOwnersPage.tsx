import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, Eye, EyeOff, UserPlus, Users } from 'lucide-react';
import { AdminPage, Pagination } from '../../components/admin/AdminParts.tsx';
import { ErrorMessage } from '../../components/common/ErrorMessage.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useToast } from '../../components/common/Toast.tsx';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { ApiError, describeError } from '../../services/api.ts';
import { api } from '../../services/client.ts';
import type { AdminRestaurantSummary, CreateOwnerInput, OwnerAccount, PageResponse } from '../../types/api.ts';
import {
  emptyOwnerForm, normaliseOwner, OWNER_LIMITS, ownerConflictField, ownerStatus, validateOwnerForm,
} from '../../utils/admin.ts';
import type { OwnerFormErrors } from '../../utils/admin.ts';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';

const PAGE_SIZE = 20;

/** Owner management (DEC-018): every owner account, its restaurants and status, and a way to create one. */
export function AdminOwnersPage() {
  usePageMeta(t('admin.owners.metaTitle'));
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResponse<OwnerAccount> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    api.listOwners({ page, size: PAGE_SIZE }).then((r) => active && setResult(r), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [page, attempt]);

  return (
    <AdminPage title={t('admin.owners.title')} actions={
      <Link to={paths.adminNewOwner()} className="btn btn-primary btn-sm"><UserPlus size={16} aria-hidden="true" /> {t('admin.owners.create')}</Link>}>
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {result === null && error === null && <Skeleton className="skeleton-block" />}
      {result && <OwnerTable owners={result.items} />}
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPage={setPage} />}
    </AdminPage>
  );
}

/** Exported for tests. */
export function OwnerTable({ owners }: { owners: OwnerAccount[] }) {
  if (owners.length === 0) {
    return (
      <div className="no-results">
        <Users size={34} strokeWidth={1.5} aria-hidden="true" />
        <h2>{t('admin.owners.emptyTitle')}</h2>
        <p>{t('admin.owners.emptyText')}</p>
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>
          <th scope="col">{t('admin.ownerForm.fullName')}</th><th scope="col">{t('admin.ownerForm.username')}</th>
          <th scope="col">{t('admin.ownerForm.email')}</th><th scope="col">{t('admin.owners.restaurants')}</th>
          <th scope="col">{t('admin.table.status')}</th>
        </tr></thead>
        <tbody>
          {owners.map((o) => (
            <tr key={o.sub}>
              <td>{o.displayName ?? '—'}</td>
              <td><code>{o.username}</code></td>
              <td>{o.email ?? '—'}</td>
              <td>
                {o.restaurants.length === 0 ? <span className="muted">{t('admin.owners.notAssigned')}</span>
                  : o.restaurants.map((r, i) => (
                    <span key={r.id}>{i > 0 && ', '}<Link to={paths.adminRestaurant(r.id)}>{r.name}</Link></span>
                  ))}
              </td>
              <td><OwnerStatusBadge owner={o} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerStatusBadge({ owner }: { owner: Pick<OwnerAccount, 'enabled' | 'passwordChangePending'> }) {
  const status = ownerStatus(owner);
  const tone = status === 'active' ? 'status-accepted' : status === 'disabled' ? 'status-rejected' : 'status-pending-payment';
  return <span className={`badge status-badge ${tone}`}>{t(`admin.owners.status.${status}`)}</span>;
}

/** Create an owner account (DEC-018), optionally assigning a restaurant through the existing assignment endpoint. */
export function AdminNewOwnerPage() {
  usePageMeta(t('admin.ownerForm.title'));
  const [form, setForm] = useState<CreateOwnerInput>(emptyOwnerForm());
  const [errors, setErrors] = useState<OwnerFormErrors>({});
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurants, setRestaurants] = useState<AdminRestaurantSummary[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ owner: OwnerAccount; restaurant: AdminRestaurantSummary | null; assignError: unknown } | null>(null);
  const toast = useToast();
  const id = useId();

  useEffect(() => {
    let active = true;
    api.listAdminRestaurants({ size: 100 }).then((r) => active && setRestaurants(r.items), () => {});
    api.getAdminDashboard().then((d) => active && setConfigured(d.ownerProvisioningConfigured), () => active && setConfigured(null));
    return () => {
      active = false;
    };
  }, []);

  async function assign(owner: OwnerAccount, restaurant: AdminRestaurantSummary) {
    try {
      await api.assignRestaurantOwner(restaurant.id, owner.sub);
      setCreated({ owner, restaurant, assignError: null });
      toast(t('admin.owner.assigned', { owner: owner.username, name: restaurant.name }));
    } catch (e) {
      setCreated({ owner, restaurant, assignError: e });
    }
  }

  async function submit() {
    const found = validateOwnerForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const owner = await api.createOwner(normaliseOwner(form));
      setForm(emptyOwnerForm()); // the temporary password does not stay in memory longer than needed
      const restaurant = restaurants.find((r) => r.id === restaurantId) ?? null;
      setCreated({ owner, restaurant, assignError: null });
      toast(t('admin.ownerForm.created', { username: owner.username }));
      if (restaurant) {
        await assign(owner, restaurant);
      }
    } catch (e) {
      const field = e instanceof ApiError ? ownerConflictField(e.code) : null;
      if (field) {
        setErrors({ [field]: `errors.${(e as ApiError).code}` });
      } else {
        setError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <AdminPage title={t('admin.ownerForm.title')}>
        <CreatedOwnerPanel owner={created.owner} restaurant={created.restaurant} assignError={created.assignError}
          onRetryAssign={created.restaurant ? () => void assign(created.owner, created.restaurant!) : undefined}
          onCreateAnother={() => setCreated(null)} />
      </AdminPage>
    );
  }

  const field = (name: keyof CreateOwnerInput, type: string, autoComplete: string, hint?: string) => {
    const fieldId = `${id}-${name}`;
    const message = errors[name];
    return (
      <label className="field" htmlFor={fieldId}>
        <span className="field-label">{t(`admin.ownerForm.${name}`)} *</span>
        <span className="input-prefix input-plain">
          <input id={fieldId} type={type} value={form[name]} autoComplete={autoComplete} required
            onChange={(e) => setForm({ ...form, [name]: name === 'username' ? e.target.value.toLowerCase() : e.target.value })}
            aria-invalid={message ? true : undefined} aria-describedby={message ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} />
        </span>
        {hint && !message && <span id={`${fieldId}-hint`} className="muted small">{hint}</span>}
        {message && <span id={`${fieldId}-error`} className="field-error">{t(message, { max: OWNER_LIMITS.fullName })}</span>}
      </label>
    );
  };

  return (
    <AdminPage title={t('admin.ownerForm.title')}>
      <section className="card">
        <p className="muted">{t('admin.ownerForm.intro')}</p>
        {configured === false && <p className="notice" role="status">{t('admin.ownerForm.notConfigured')}</p>}
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
          <div className="admin-form-grid">
            {field('fullName', 'text', 'off')}
            {field('email', 'email', 'off')}
            {field('username', 'text', 'off', t('admin.ownerForm.usernameHint'))}
            <label className="field" htmlFor={`${id}-temporaryPassword`}>
              <span className="field-label">{t('admin.ownerForm.temporaryPassword')} *</span>
              <span className="input-prefix input-plain password-field">
                <input id={`${id}-temporaryPassword`} type={showPassword ? 'text' : 'password'} value={form.temporaryPassword}
                  autoComplete="new-password" required onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                  aria-invalid={errors.temporaryPassword ? true : undefined}
                  aria-describedby={errors.temporaryPassword ? `${id}-pw-error` : `${id}-pw-hint`} />
                <button type="button" className="icon-button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? 'admin.ownerForm.hidePassword' : 'admin.ownerForm.showPassword')}>
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </span>
              {errors.temporaryPassword ? <span id={`${id}-pw-error`} className="field-error">{t(errors.temporaryPassword)}</span>
                : <span id={`${id}-pw-hint`} className="muted small">{t('admin.ownerForm.passwordHint')}</span>}
            </label>
            <label className="field field-wide" htmlFor={`${id}-restaurant`}>
              <span className="field-label">{t('admin.ownerForm.restaurant')}</span>
              <select id={`${id}-restaurant`} className="select" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                <option value="">{t('admin.ownerForm.assignLater')}</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.owner && !r.owner.needsReassignment ? ` — ${t('admin.ownerForm.replaces', { owner: r.owner.username })}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error !== null && <ErrorMessage error={error} />}
          <div className="owner-dish-actions">
            <Link to={paths.adminOwners()} className="btn btn-ghost btn-sm">{t('kitchen.cancel')}</Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || configured === false} aria-busy={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}{t('admin.owners.create')}
            </button>
          </div>
        </form>
      </section>
    </AdminPage>
  );
}

/** Exported for tests. The outcome of a creation, including a failed assignment that can be retried. */
export function CreatedOwnerPanel({ owner, restaurant, assignError, onRetryAssign, onCreateAnother }: {
  owner: OwnerAccount; restaurant: AdminRestaurantSummary | null; assignError: unknown;
  onRetryAssign?: () => void; onCreateAnother: () => void;
}) {
  const assigned = restaurant && assignError === null;
  return (
    <section className="card" role="status">
      <h2 className="card-title"><CircleCheck size={20} aria-hidden="true" /> {t('admin.ownerForm.createdTitle', { username: owner.username })}</h2>
      <p>{t('admin.ownerForm.createdText', { name: owner.displayName ?? owner.username, email: owner.email ?? '' })}</p>
      <p className="notice">{t('admin.ownerForm.sharePassword')}</p>
      {assigned && <p>{t('admin.ownerForm.assignedTo', { name: restaurant.name })}</p>}
      {!restaurant && <p className="muted">{t('admin.ownerForm.notAssignedYet')}</p>}
      {restaurant && assignError !== null && (
        <div className="alert" role="alert">
          <div className="alert-body">
            <p>{t('admin.ownerForm.assignFailed', { name: restaurant.name })} {describeError(assignError)}</p>
            {onRetryAssign && <div className="alert-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={onRetryAssign}>{t('admin.ownerForm.retryAssign')}</button>
            </div>}
          </div>
        </div>
      )}
      <div className="page-actions">
        <Link to={paths.adminOwners()} className="btn btn-secondary btn-sm">{t('admin.owners.back')}</Link>
        {restaurant && <Link to={paths.adminRestaurant(restaurant.id)} className="btn btn-ghost btn-sm">{t('admin.ownerForm.openRestaurant')}</Link>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCreateAnother}>{t('admin.ownerForm.createAnother')}</button>
      </div>
    </section>
  );
}

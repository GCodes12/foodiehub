import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, RefreshCw, UserPlus } from 'lucide-react';
import { ActiveBadge, AdminPage, StatCards } from '../../components/admin/AdminParts.tsx';
import { ErrorMessage } from '../../components/common/ErrorMessage.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { api } from '../../services/client.ts';
import type { AdminDashboard, AdminOrderSummary, AdminRestaurantSummary, Order, OwnerAccount, PageResponse } from '../../types/api.ts';
import { OwnerStatusBadge } from './AdminOwnersPage.tsx';
import { activityRows, dashboardCards } from '../../utils/admin.ts';
import { t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { FLOW } from '../../utils/orderStatus.ts';
import { paths } from '../../utils/paths.ts';

export type Loaded<T> = { data: T | null; error: unknown };
const none = { data: null, error: null };

function settle<T>(result: PromiseSettledResult<T>): Loaded<T> {
  return result.status === 'fulfilled' ? { data: result.value, error: null } : { data: null, error: result.reason };
}

/** Platform overview (DEC-017): summary cards, recent orders and restaurant activity, all from the backend. */
export function AdminDashboardPage() {
  usePageMeta(t('admin.dashboard.metaTitle'));
  const [dashboard, setDashboard] = useState<Loaded<AdminDashboard>>(none);
  const [summary, setSummary] = useState<Loaded<AdminOrderSummary>>(none);
  const [recent, setRecent] = useState<Loaded<Order[]>>(none);
  const [restaurants, setRestaurants] = useState<AdminRestaurantSummary[]>([]);
  const [owners, setOwners] = useState<Loaded<PageResponse<OwnerAccount>>>(none);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, s, o, r, w] = await Promise.allSettled([
      api.getAdminDashboard(), api.getAdminOrderSummary(), api.listAdminOrders({ size: 8 }), api.listAdminRestaurants({ size: 100 }),
      api.listOwners({ size: 5 }),
    ]);
    setOwners(settle(w));
    setDashboard(settle(d));
    setSummary(settle(s));
    setRecent(o.status === 'fulfilled' ? { data: o.value.items, error: null } : { data: null, error: o.reason });
    setRestaurants(r.status === 'fulfilled' ? r.value.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const names = new Map(restaurants.map((r) => [r.id, r.name] as const));
  const activity = summary.data ? activityRows(summary.data.restaurants, restaurants) : [];

  return (
    <AdminPage title={t('admin.dashboard.title')} actions={
      <div className="owner-toolbar-right">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" className={loading ? 'spin' : undefined} /> {t('kitchen.refresh')}
        </button>
        <Link to={paths.adminNewRestaurant()} className="btn btn-primary btn-sm"><Plus size={16} aria-hidden="true" /> {t('admin.restaurants.new')}</Link>
      </div>}>
      {dashboard.error !== null && <ErrorMessage error={dashboard.error} onRetry={() => void load()} />}
      {summary.error !== null && <ErrorMessage error={summary.error} onRetry={() => void load()} />}
      {loading && !dashboard.data ? <Skeleton className="skeleton-block" /> : <StatCards cards={dashboardCards(dashboard.data, summary.data)} />}
      {dashboard.data && !dashboard.data.userDirectoryAvailable && (
        <p className="notice" role="status">{t('admin.dashboard.directoryUnavailable')}</p>
      )}
      {summary.data && (
        <p className="muted small">{t('admin.dashboard.value', { total: formatRupees(summary.data.totalValue), today: formatRupees(summary.data.valueToday) })}
          {' · '}{t('admin.dashboard.timeZone', { zone: summary.data.timeZone })}</p>
      )}

      <div className="admin-columns">
        <section className="card" aria-labelledby="recent-orders">
          <div className="card-head">
            <h2 id="recent-orders" className="card-title">{t('admin.dashboard.recentOrders')}</h2>
            <Link to={paths.adminOrders()} className="link-arrow">{t('admin.dashboard.allOrders')}</Link>
          </div>
          {recent.error !== null && <ErrorMessage error={recent.error} />}
          {recent.data === null && recent.error === null && <Skeleton className="skeleton-block" />}
          {recent.data?.length === 0 && <p className="muted">{t('admin.orders.emptyText')}</p>}
          {recent.data && recent.data.length > 0 && (
            <ul className="admin-list">
              {recent.data.map((o) => (
                <li key={o.id} className="admin-list-row">
                  <code>{o.id.slice(0, 8).toUpperCase()}</code>
                  <span className="admin-list-main">{names.get(o.restaurantId) ?? o.restaurantId}</span>
                  <StatusBadge status={o.status} />
                  <strong className="price">{formatRupees(o.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="order-stats">
          <h2 id="order-stats" className="card-title">{t('admin.dashboard.byStatus')}</h2>
          {summary.data ? (
            <ul className="admin-list">
              {[...FLOW, 'REJECTED' as const].map((status) => (
                <li key={status} className="admin-list-row">
                  <StatusBadge status={status} /><span className="admin-list-main" />
                  <strong data-testid={`status-${status}`}>{summary.data?.byStatus[status] ?? 0}</strong>
                </li>
              ))}
            </ul>
          ) : summary.error === null && <Skeleton className="skeleton-block" />}
        </section>
      </div>

      <OwnerManagement owners={owners} canCreate={dashboard.data?.ownerProvisioningConfigured !== false} />

      <section className="card" aria-labelledby="activity">
        <h2 id="activity" className="card-title">{t('admin.dashboard.activity')}</h2>
        {summary.data && activity.length === 0 && <p className="muted">{t('admin.dashboard.noActivity')}</p>}
        {activity.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th scope="col">{t('admin.table.restaurant')}</th><th scope="col">{t('admin.table.status')}</th>
                <th scope="col" className="num">{t('admin.table.orders')}</th><th scope="col" className="num">{t('admin.table.today')}</th>
                <th scope="col">{t('admin.table.lastOrder')}</th>
              </tr></thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.restaurantId}>
                    <td>{a.active === null ? a.name : <Link to={paths.adminRestaurant(a.restaurantId)}>{a.name}</Link>}</td>
                    <td>{a.active === null ? '—' : <ActiveBadge active={a.active} />}</td>
                    <td className="num">{a.orders}</td>
                    <td className="num">{a.ordersToday}</td>
                    <td>{a.lastOrderAt ? new Date(a.lastOrderAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminPage>
  );
}

/** Exported for tests. Owner management on the dashboard (DEC-018): a few owner accounts and the Create Owner action. */
export function OwnerManagement({ owners, canCreate }: { owners: Loaded<PageResponse<OwnerAccount>>; canCreate: boolean }) {
  return (
    <section className="card" aria-labelledby="owner-management">
      <div className="card-head">
        <h2 id="owner-management" className="card-title">{t('admin.owners.management')}</h2>
        <div className="owner-toolbar-right">
          <Link to={paths.adminOwners()} className="link-arrow">{t('admin.owners.manage')}</Link>
          {canCreate && <Link to={paths.adminNewOwner()} className="btn btn-primary btn-sm"><UserPlus size={16} aria-hidden="true" /> {t('admin.owners.create')}</Link>}
        </div>
      </div>
      {!canCreate && <p className="notice">{t('admin.ownerForm.notConfigured')}</p>}
      {owners.error !== null && <ErrorMessage error={owners.error} />}
      {owners.data === null && owners.error === null && <Skeleton className="skeleton-block" />}
      {owners.data?.items.length === 0 && <p className="muted">{t('admin.owners.emptyText')}</p>}
      {owners.data && owners.data.items.length > 0 && (
        <>
          <ul className="admin-list">
            {owners.data.items.map((o) => (
              <li key={o.sub} className="admin-list-row">
                <span className="admin-list-main"><strong>{o.displayName ?? o.username}</strong> <span className="muted small">{o.email ?? o.username}</span></span>
                <span className="muted small">{o.restaurants.length ? o.restaurants.map((r) => r.name).join(', ') : t('admin.owners.notAssigned')}</span>
                <OwnerStatusBadge owner={o} />
              </li>
            ))}
          </ul>
          <p className="muted small">{t('admin.owners.total', { count: owners.data.totalItems })}</p>
        </>
      )}
    </section>
  );
}


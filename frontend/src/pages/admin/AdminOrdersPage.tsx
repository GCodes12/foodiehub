import { useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { AdminPage, Pagination } from '../../components/admin/AdminParts.tsx';
import { ErrorMessage } from '../../components/common/ErrorMessage.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { StatusBadge } from '../../components/common/StatusBadge.tsx';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { api } from '../../services/client.ts';
import type { AdminRestaurantSummary, Order, OrderStatus, PageResponse } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { FLOW } from '../../utils/orderStatus.ts';

const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = [...FLOW, 'REJECTED'];

/** Orders across every restaurant (DEC-017), newest first, read-only. No customer identity is shown or returned. */
export function AdminOrdersPage() {
  usePageMeta(t('admin.orders.metaTitle'));
  const [page, setPage] = useState(0);
  const [restaurantId, setRestaurantId] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [result, setResult] = useState<PageResponse<Order> | null>(null);
  const [restaurants, setRestaurants] = useState<AdminRestaurantSummary[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.listAdminRestaurants({ size: 100 }).then((r) => active && setRestaurants(r.items), () => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    api.listAdminOrders({ page, size: PAGE_SIZE, restaurantId: restaurantId || undefined, status: status || undefined })
      .then((r) => active && setResult(r), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [page, restaurantId, status, attempt]);

  return (
    <AdminPage title={t('admin.orders.title')}>
      <div className="owner-toolbar">
        <div className="admin-filters">
          <label className="field">
            <span className="field-label">{t('admin.table.restaurant')}</span>
            <select className="select" value={restaurantId} onChange={(e) => { setPage(0); setRestaurantId(e.target.value); }}>
              <option value="">{t('admin.orders.allRestaurants')}</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('admin.table.status')}</span>
            <select className="select" value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as OrderStatus | ''); }}>
              <option value="">{t('admin.orders.allStatuses')}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`order.statuses.${s}`)}</option>)}
            </select>
          </label>
        </div>
        {result && <span className="muted small">{t('admin.orders.count', { count: result.totalItems })}</span>}
      </div>
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {result === null && error === null && <Skeleton className="skeleton-block" />}
      {result && <OrderTable orders={result.items} restaurants={restaurants} />}
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPage={setPage} />}
    </AdminPage>
  );
}

/** Exported for tests. */
export function OrderTable({ orders, restaurants }: { orders: Order[]; restaurants: AdminRestaurantSummary[] }) {
  if (orders.length === 0) {
    return (
      <div className="no-results">
        <ReceiptText size={34} strokeWidth={1.5} aria-hidden="true" />
        <h2>{t('admin.orders.emptyTitle')}</h2>
        <p>{t('admin.orders.emptyText')}</p>
      </div>
    );
  }
  const names = new Map(restaurants.map((r) => [r.id, r.name] as const));
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>
          <th scope="col">{t('admin.table.order')}</th><th scope="col">{t('admin.table.restaurant')}</th>
          <th scope="col">{t('admin.table.status')}</th><th scope="col" className="num">{t('admin.table.items')}</th>
          <th scope="col" className="num">{t('admin.table.total')}</th><th scope="col">{t('admin.table.placed')}</th>
        </tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><code>{o.id.slice(0, 8).toUpperCase()}</code></td>
              <td>{names.get(o.restaurantId) ?? o.restaurantId}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="num">{o.items.reduce((sum, line) => sum + line.quantity, 0)}</td>
              <td className="num">{formatRupees(o.total)}</td>
              <td>{new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

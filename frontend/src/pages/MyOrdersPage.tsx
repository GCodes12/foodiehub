import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { DishImage } from '../components/common/DishImage.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { Skeleton } from '../components/common/Skeleton.tsx';
import { useMenu } from '../hooks/useMenu.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { usePolling } from '../hooks/usePolling.ts';
import { api } from '../services/client.ts';
import type { Order } from '../types/api.ts';
import { t } from '../utils/i18n.ts';
import { isActive } from '../utils/orderStatus.ts';
import { formatRupees } from '../utils/money.ts';
import { paths } from '../utils/paths.ts';

/** The signed-in customer's real order history: GET /api/v1/orders (DEC-014), newest first. */
export function MyOrdersPage() {
  usePageMeta(t('orders.metaTitle'));
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const menu = useMenu();

  useEffect(() => {
    let active = true;
    setError(null);
    api.listOrders().then((list) => active && setOrders(list), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [attempt]);

  usePolling(() => {
    api.listOrders().then(setOrders, () => {});
  }, 20_000, orders !== null && orders.some((o) => isActive(o.status)));

  const byId = new Map(menu.status === 'ready' ? menu.data.items.map((i) => [i.id, i] as const) : []);

  if (orders?.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={ClipboardList} title={t('orders.emptyTitle')} text={t('orders.emptyText')}>
          <Link to={paths.menu()} className="btn btn-primary btn-lg">{t('orders.emptyCta')}</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page page-narrow">
      <header className="page-header">
        <h1 className="page-title">{t('orders.title')}</h1>
        <p className="page-subtitle">{t('orders.subtitle')}</p>
      </header>
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {orders === null && error === null && (
        <div className="order-list" aria-label={t('orders.loading')}>{[0, 1, 2].map((i) => <Skeleton key={i} className="skeleton-row" />)}</div>
      )}
      {orders && (
        <ul className="order-list">
          {orders.map((order) => {
            const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <li key={order.id}>
                <Link to={paths.order(order.id)} className="order-row" aria-label={`${t('orders.view')} ${order.id.slice(0, 8).toUpperCase()}`}>
                  <div className="order-row-art">
                    {order.items.slice(0, 3).map((line) => {
                      const item = byId.get(line.menuItemId);
                      return <DishImage key={line.menuItemId} name={line.name} imageKey={item?.imageKey ?? null}
                        category={item?.category ?? 'OTHER'} className="order-row-image" />;
                    })}
                  </div>
                  <div className="order-row-main">
                    <div className="order-row-title"><code>{order.id.slice(0, 8).toUpperCase()}</code>
                      <StatusBadge status={order.status} /></div>
                    <div className="order-row-items">{order.items.map((line) => line.name).join(', ')}</div>
                    <div className="muted small">
                      {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{t('orders.summary', { count, total: formatRupees(order.total) })}
                    </div>
                  </div>
                  <ChevronRight className="order-row-chevron" size={20} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

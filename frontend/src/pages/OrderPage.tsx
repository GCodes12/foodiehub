import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CircleCheck, ClipboardList, ReceiptText, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { Skeleton } from '../components/common/Skeleton.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { OrderDetails } from '../components/order/OrderDetails.tsx';
import { useMenu } from '../hooks/useMenu.ts';
import { usePolling } from '../hooks/usePolling.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { ApiError } from '../services/api.ts';
import { api } from '../services/client.ts';
import type { Order } from '../types/api.ts';
import { t } from '../utils/i18n.ts';
import { isActive } from '../utils/orderStatus.ts';
import { paths } from '../utils/paths.ts';

/** Order confirmation (?placed=1) and order details, from GET /api/v1/orders/{id} (owner only). */
export function OrderPage() {
  usePageMeta(t('order.metaTitle'));
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.has('placed');
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const menu = useMenu();
  const toast = useToast();

  useEffect(() => {
    let active = true;
    setError(null);
    api.getOrder(orderId).then((o) => {
      if (!active) {
        return;
      }
      setOrder(o);
      api.getRestaurant(o.restaurantId).then((r) => active && setRestaurantName(r.name), () => {});
    }, (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  // Live status (DEC-016): re-check while the order is still in progress.
  usePolling(() => {
    api.getOrder(orderId).then(setOrder, () => {});
  }, 20_000, order !== null && isActive(order.status));

  const artwork = useMemo(() => new Map(menu.status === 'ready'
    ? menu.data.items.map((i) => [i.id, { imageKey: i.imageKey, category: i.category }] as const) : []), [menu]);

  if (error instanceof ApiError && error.status === 404) {
    // Also shown for someone else's order: the API deliberately makes the two cases identical.
    return (
      <div className="container page">
        <EmptyState icon={ReceiptText} title={t('order.notFoundTitle')} text={t('order.notFoundText')}>
          <Link to={paths.myOrders()} className="btn btn-secondary">{t('order.backToOrders')}</Link>
        </EmptyState>
      </div>
    );
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('order.copied'));
    } catch {
      // Clipboard blocked: the ID is still visible and selectable.
    }
  }

  return (
    <div className="container page">
      {justPlaced && order ? (
        <section className="success-banner" role="status">
          <span className="success-check"><CircleCheck size={30} aria-hidden="true" /></span>
          <div>
            <h1 className="success-title">{t('order.placedTitle')}</h1>
            <p>{t('order.placedText')}</p>
          </div>
        </section>
      ) : (
        <header className="page-header"><h1 className="page-title">{t('order.title')}</h1></header>
      )}
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {order === null && error === null && (
        <div className="card" aria-label={t('order.loading')}><Skeleton className="skeleton-line skeleton-w40" /><Skeleton className="skeleton-block" /></div>
      )}
      {order && <OrderDetails order={order} restaurantName={restaurantName} artwork={artwork} onCopy={(id) => void copy(id)} />}
      <div className="page-actions">
        <Link to={paths.myOrders()} className="btn btn-secondary"><ClipboardList size={16} aria-hidden="true" /> {t('order.backToOrders')}</Link>
        <Link to={paths.menu()} className="btn btn-ghost"><UtensilsCrossed size={16} aria-hidden="true" /> {t('order.orderMore')}</Link>
        {!justPlaced && <Link to={paths.home()} className="btn btn-ghost"><ArrowLeft size={16} aria-hidden="true" /> {t('nav.home')}</Link>}
      </div>
    </div>
  );
}

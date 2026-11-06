import { Clock, ReceiptText } from 'lucide-react';
import type { Order } from '../../types/api.ts';
import { hasMessage, t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';

function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** Incoming orders for the owner's restaurants (server data, newest first) with a summary of today's orders. */
export function OwnerOrderList({ orders, now = new Date() }: { orders: Order[]; now?: Date }) {
  const today = orders.filter((o) => isToday(o.createdAt, now));
  const todayTotal = today.reduce((sum, o) => sum + Math.round(o.total * 100), 0) / 100;
  return (
    <>
      <dl className="owner-stats">
        <div className="owner-stat"><dt>{t('kitchen.ordersToday')}</dt><dd data-testid="orders-today">{today.length}</dd></div>
        <div className="owner-stat"><dt>{t('kitchen.valueToday')}</dt><dd>{formatRupees(todayTotal)}</dd></div>
        <div className="owner-stat"><dt>{t('kitchen.ordersAll')}</dt><dd>{orders.length}</dd></div>
      </dl>
      {orders.length === 0 ? (
        <div className="no-results">
          <ReceiptText size={34} strokeWidth={1.5} aria-hidden="true" />
          <h2>{t('kitchen.noOrdersTitle')}</h2>
          <p>{t('kitchen.noOrdersText')}</p>
        </div>
      ) : (
        <ul className="owner-orders">
          {orders.map((order) => (
            <li key={order.id} className="owner-order card">
              <div className="owner-order-head">
                <code className="owner-order-id">{order.id.slice(0, 8).toUpperCase()}</code>
                <span className="badge badge-warning">
                  {hasMessage(`order.statuses.${order.status}`) ? t(`order.statuses.${order.status}`) : order.status}
                </span>
                <span className="owner-order-time"><Clock size={14} aria-hidden="true" />
                  {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <ul className="owner-order-lines">
                {order.items.map((line) => (
                  <li key={line.menuItemId}><strong>{line.quantity} ×</strong> {line.name}</li>
                ))}
              </ul>
              <div className="owner-order-foot">
                <span className="muted small">
                  {hasMessage(`order.fulfilmentTypes.${order.fulfilmentType}`) ? t(`order.fulfilmentTypes.${order.fulfilmentType}`) : order.fulfilmentType}
                </span>
                <strong className="price">{formatRupees(order.total)}</strong>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{t('kitchen.statusNote')}</p>
    </>
  );
}

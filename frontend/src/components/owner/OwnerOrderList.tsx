import { ChefHat, CircleCheck, CircleX, Clock, PackageCheck, ReceiptText, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Order, OrderStatus } from '../../types/api.ts';
import { hasMessage, t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { awaitsDecision, nextStep } from '../../utils/orderStatus.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const NEXT_ICONS: Partial<Record<OrderStatus, LucideIcon>> = { PREPARING: ChefHat, READY_FOR_PICKUP: ShoppingBag, PICKED_UP: PackageCheck };

export interface OrderActions {
  onAccept: (order: Order) => void;
  onReject: (order: Order) => void;
  onAdvance: (order: Order, to: OrderStatus) => void;
  /** The order whose change is being sent (its buttons are disabled). */
  busyId?: string | null;
}

/** Orders for the owner's restaurants (server data, newest first), with today's summary and lifecycle buttons. */
export function OwnerOrderList({ orders, allOrders = orders, now = new Date(), actions, emptyTitle, emptyText }: {
  orders: Order[];
  /** Used for the summary tiles (all tabs); defaults to `orders`. */
  allOrders?: Order[];
  now?: Date;
  actions?: OrderActions;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const today = allOrders.filter((o) => isToday(o.createdAt, now) && o.status !== 'REJECTED');
  const todayTotal = today.reduce((sum, o) => sum + Math.round(o.total * 100), 0) / 100;
  const waiting = allOrders.filter((o) => awaitsDecision(o.status)).length;
  return (
    <>
      <dl className="owner-stats">
        <div className="owner-stat"><dt>{t('kitchen.waiting')}</dt><dd data-testid="orders-waiting">{waiting}</dd></div>
        <div className="owner-stat"><dt>{t('kitchen.ordersToday')}</dt><dd data-testid="orders-today">{today.length}</dd></div>
        <div className="owner-stat"><dt>{t('kitchen.valueToday')}</dt><dd>{formatRupees(todayTotal)}</dd></div>
      </dl>
      {orders.length === 0 ? (
        <div className="no-results">
          <ReceiptText size={34} strokeWidth={1.5} aria-hidden="true" />
          <h2>{emptyTitle ?? t('kitchen.noOrdersTitle')}</h2>
          <p>{emptyText ?? t('kitchen.noOrdersText')}</p>
        </div>
      ) : (
        <ul className="owner-orders">
          {orders.map((order) => {
            const next = nextStep(order.status);
            const NextIcon = next ? NEXT_ICONS[next] : null;
            const busy = actions?.busyId === order.id;
            return (
              <li key={order.id} className={`owner-order card${awaitsDecision(order.status) ? ' is-new' : ''}`}>
                <div className="owner-order-head">
                  <code className="owner-order-id">{order.id.slice(0, 8).toUpperCase()}</code>
                  <StatusBadge status={order.status} />
                  <span className="owner-order-time"><Clock size={14} aria-hidden="true" />
                    {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <ul className="owner-order-lines">
                  {order.items.map((line) => (
                    <li key={line.menuItemId}><strong>{line.quantity} ×</strong> {line.name}</li>
                  ))}
                </ul>
                {order.status === 'REJECTED' && order.rejectReason && hasMessage(`order.rejectReasons.${order.rejectReason}`) && (
                  <p className="muted small">{t('kitchen.rejectedBecause', { reason: t(`order.rejectReasons.${order.rejectReason}`) })}</p>
                )}
                <div className="owner-order-foot">
                  <span className="muted small">
                    {hasMessage(`order.fulfilmentTypes.${order.fulfilmentType}`) ? t(`order.fulfilmentTypes.${order.fulfilmentType}`) : order.fulfilmentType}
                    {order.status !== 'REJECTED' && order.status !== 'PICKED_UP' && ` · ${t('kitchen.payAtCounter')}`}
                  </span>
                  <strong className="price">{formatRupees(order.total)}</strong>
                </div>
                {actions && awaitsDecision(order.status) && (
                  <div className="owner-order-actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => actions.onReject(order)}>
                      <CircleX size={16} aria-hidden="true" /> {t('kitchen.actions.reject')}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => actions.onAccept(order)}>
                      {busy ? <span className="spinner" aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}
                      {t('kitchen.actions.accept')}
                    </button>
                  </div>
                )}
                {actions && next && NextIcon && (
                  <div className="owner-order-actions">
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => actions.onAdvance(order, next)}>
                      {busy ? <span className="spinner" aria-hidden="true" /> : <NextIcon size={16} aria-hidden="true" />}
                      {t(`kitchen.actions.${next}`)}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

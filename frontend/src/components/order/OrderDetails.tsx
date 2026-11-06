import { useState } from 'react';
import { CircleCheck, Clock, Copy, Receipt, Store, Wallet } from 'lucide-react';
import type { Order } from '../../types/api.ts';
import { hasMessage, t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { DishImage } from '../common/DishImage.tsx';

interface Props {
  order: Order;
  restaurantName: string | null;
  /** imageKey/category per menu item id, when the menu is loaded (order lines do not carry them). */
  artwork?: Map<string, { imageKey: string | null; category: string }>;
  onCopy?: (text: string) => void;
}

function label(group: string, value: string): string {
  return hasMessage(`order.${group}.${value}`) ? t(`order.${group}.${value}`) : value;
}

/** Order receipt with the server's prices, status and fulfilment exactly as returned by the Order Service. */
export function OrderDetails({ order, restaurantName, artwork, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const shortId = order.id.slice(0, 8).toUpperCase();
  return (
    <div className="order-grid">
      <section className="card order-meta-card" aria-label={t('order.title')}>
        <div className="order-number">
          <span className="field-label">{t('order.orderNumber')}</span>
          <span className="order-number-value">
            <code>{shortId}</code>
            {onCopy && (
              <button type="button" className="icon-button" aria-label={t('order.copy')} title={t('order.copy')}
                onClick={() => { onCopy(order.id); setCopied(true); }}>
                {copied ? <CircleCheck size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              </button>
            )}
          </span>
        </div>
        <dl className="order-facts">
          <div><dt>{t('order.status')}</dt><dd><span className="badge badge-warning">{label('statuses', order.status)}</span></dd></div>
          {restaurantName && <div><dt>{t('order.restaurant')}</dt><dd><Store size={15} aria-hidden="true" /> {restaurantName}</dd></div>}
          <div><dt>{t('order.fulfilment')}</dt><dd>{label('fulfilmentTypes', order.fulfilmentType)}</dd></div>
          <div><dt><Clock size={15} aria-hidden="true" /></dt><dd>{t('order.placedAt', {
            date: new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          })}</dd></div>
        </dl>
        {order.status === 'PENDING_PAYMENT' && (
          <p className="order-payment-note"><Wallet size={16} aria-hidden="true" /> {t('order.paymentNote')}</p>
        )}
        <p className="muted small">{t('order.fullId')}: <code>{order.id}</code></p>
      </section>

      <section className="card" aria-labelledby="receipt-title">
        <h2 id="receipt-title" className="card-title"><Receipt size={18} aria-hidden="true" /> {t('order.items')}</h2>
        <ul className="receipt">
          {order.items.map((line) => {
            const art = artwork?.get(line.menuItemId);
            return (
              <li key={line.menuItemId} className="receipt-line">
                <DishImage name={line.name} imageKey={art?.imageKey ?? null} category={art?.category ?? 'OTHER'} className="receipt-image" />
                <div className="receipt-main">
                  <div className="receipt-name">{line.name}</div>
                  <div className="muted small">{line.quantity} × {formatRupees(line.unitPrice)}</div>
                </div>
                <div className="receipt-amount">{formatRupees(line.lineAmount)}</div>
              </li>
            );
          })}
        </ul>
        <dl className="summary">
          <div className="summary-row"><dt>{t('order.subtotal')}</dt><dd>{formatRupees(order.subtotal)}</dd></div>
          <div className="summary-row summary-total"><dt>{t('order.total')}</dt><dd data-testid="order-total">{formatRupees(order.total)}</dd></div>
        </dl>
        <p className="summary-note">{t('order.pricesNote')}</p>
      </section>
    </div>
  );
}

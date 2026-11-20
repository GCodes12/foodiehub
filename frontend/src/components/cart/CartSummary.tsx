import type { ReactNode } from 'react';
import { t } from '../../utils/i18n.ts';
import { formatPaise } from '../../utils/money.ts';

/** Totals box. Prices are an estimate for display; the server prices the order. */
export function CartSummary({ totalPaise, count, children }: { totalPaise: number; count: number; children?: ReactNode }) {
  return (
    <aside className="summary-card" aria-label={t('cart.summary')}>
      <h2 className="summary-title">{t('cart.summary')}</h2>
      <dl className="summary">
        <div className="summary-row">
          <dt>{t('cart.itemTotal')} <span className="muted">({t('cart.items', { count })})</span></dt>
          <dd>{formatPaise(totalPaise)}</dd>
        </div>
        <div className="summary-row summary-total">
          <dt>{t('cart.estimatedTotal')}</dt>
          <dd data-testid="cart-total">{formatPaise(totalPaise)}</dd>
        </div>
      </dl>
      <p className="summary-note">{t('cart.estimateNote')}</p>
      {children}
    </aside>
  );
}

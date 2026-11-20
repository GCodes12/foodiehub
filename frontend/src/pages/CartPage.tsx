import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { CartLineItem } from '../components/cart/CartLineItem.tsx';
import { CartSummary } from '../components/cart/CartSummary.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { useCartCheck } from '../hooks/useCartCheck.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { t } from '../utils/i18n.ts';
import { paths } from '../utils/paths.ts';

export function CartPage() {
  usePageMeta(t('cart.metaTitle'));
  const { cart, count, totalPaise, setQuantity, remove, clear, unavailableIds, repricedIds, foreign } = useCartCheck();
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  if (cart.lines.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={ShoppingBag} title={t('cart.emptyTitle')} text={t('cart.emptyText')}>
          <Link to={paths.menu()} className="btn btn-primary btn-lg">{t('cart.emptyCta')}</Link>
        </EmptyState>
      </div>
    );
  }

  const blocked = foreign || unavailableIds.size > 0;
  return (
    <div className="container page">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">{t('cart.title')}</h1>
          <p className="page-subtitle">{t('cart.items', { count })}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(true)}>
          <Trash2 size={16} aria-hidden="true" /> {t('cart.clear')}
        </button>
      </header>
      {foreign && <div className="notice" role="status">{t('cart.otherRestaurant')}</div>}
      <div className="two-column">
        <ul className="cart-lines card">
          {cart.lines.map((line) => (
            <CartLineItem key={line.menuItemId} line={line} unavailable={unavailableIds.has(line.menuItemId)}
              repriced={repricedIds.has(line.menuItemId)}
              onQuantity={(q) => setQuantity(line.menuItemId, q)} onRemove={() => remove(line.menuItemId)} />
          ))}
        </ul>
        <CartSummary totalPaise={totalPaise} count={count}>
          {blocked && <p className="summary-warning" role="status">{t('cart.removeUnavailable')}</p>}
          {blocked ? (
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled>{t('cart.checkout')}</button>
          ) : (
            <Link to={paths.checkout()} className="btn btn-primary btn-lg btn-block">
              {t('cart.checkout')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
          <Link to={paths.menu()} className="btn btn-ghost btn-block"><ArrowLeft size={16} aria-hidden="true" /> {t('cart.continueShopping')}</Link>
        </CartSummary>
      </div>
      <ConfirmDialog open={confirmClear} title={t('cart.clearTitle')} text={t('cart.clearText')}
        confirmLabel={t('cart.clearConfirm')} cancelLabel={t('cart.cancel')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => { clear(); setConfirmClear(false); toast(t('cart.cleared')); }} />
    </div>
  );
}

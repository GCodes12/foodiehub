import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck, Pencil, ShoppingBag, Store, Wallet } from 'lucide-react';
import { CartLineItem } from '../components/cart/CartLineItem.tsx';
import { CartSummary } from '../components/cart/CartSummary.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useCartCheck } from '../hooks/useCartCheck.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { ApiError } from '../services/api.ts';
import { api } from '../services/client.ts';
import { sessionStore } from '../services/storage.ts';
import { toOrderRequest } from '../utils/cart.ts';
import { forgetIdempotencyKey, idempotencyKeyFor } from '../utils/checkout.ts';
import { t } from '../utils/i18n.ts';
import { formatPaise } from '../utils/money.ts';
import { paths } from '../utils/paths.ts';

/** Checkout (protected route): review, pickup, confirm. One Idempotency-Key per attempt makes retries safe. */
export function CheckoutPage() {
  usePageMeta(t('checkout.metaTitle'));
  const auth = useAuth();
  const { cart, count, totalPaise, clear, unavailableIds, foreign, menu } = useCartCheck();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inFlight = useRef(false);
  const navigate = useNavigate();

  if (cart.lines.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={ShoppingBag} title={t('checkout.emptyTitle')} text={t('checkout.emptyText')}>
          <Link to={paths.menu()} className="btn btn-primary btn-lg">{t('cart.emptyCta')}</Link>
        </EmptyState>
      </div>
    );
  }

  const blocked = foreign || unavailableIds.size > 0;
  const total = formatPaise(totalPaise);

  async function placeOrder() {
    if (inFlight.current || blocked) {
      return; // double clicks and repeated submits do nothing while a request is running
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const request = toOrderRequest(cart);
    const key = idempotencyKeyFor(request, sessionStore);
    try {
      const { order } = await api.createOrder(request, key);
      forgetIdempotencyKey(sessionStore);
      clear();
      navigate(paths.order(order.id, true), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'IDEMPOTENCY_KEY_REUSED') {
        forgetIdempotencyKey(sessionStore);
      }
      if (e instanceof ApiError && (e.code === 'ITEM_UNAVAILABLE' || e.code === 'ITEM_NOT_IN_MENU')) {
        menu.reload(); // refresh availability so the unavailable dish is flagged in the review
      }
      setError(e);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-title">{t('checkout.title')}</h1>
        {auth.displayName && <p className="page-subtitle">{t('checkout.orderingAs', { name: auth.displayName })}</p>}
      </header>
      <div className="two-column">
        <div className="checkout-steps">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">{t('checkout.reviewTitle')}</h2>
              <Link to={paths.cart()} className="link-arrow"><Pencil size={15} aria-hidden="true" /> {t('checkout.editCart')}</Link>
            </div>
            <ul className="cart-lines">
              {cart.lines.map((line) => (
                <CartLineItem key={line.menuItemId} line={line} unavailable={unavailableIds.has(line.menuItemId)} />
              ))}
            </ul>
          </section>
          <section className="card">
            <h2 className="card-title">{t('checkout.fulfilmentTitle')}</h2>
            <label className="option-card is-selected">
              <input type="radio" name="fulfilment" value="PICKUP" checked readOnly />
              <Store size={22} aria-hidden="true" />
              <span>
                <span className="option-title">{t('checkout.pickupTitle')}</span>
                <span className="option-text">{t('checkout.pickupText')}</span>
              </span>
              <CircleCheck className="option-check" size={20} aria-hidden="true" />
            </label>
            <p className="muted small">{t('checkout.deliveryNote')}</p>
          </section>
          <section className="card">
            <h2 className="card-title"><Wallet size={18} aria-hidden="true" /> {t('checkout.paymentTitle')}</h2>
            <p className="muted">{t('checkout.paymentText')}</p>
          </section>
        </div>
        <CartSummary totalPaise={totalPaise} count={count}>
          {blocked && (
            <p className="summary-warning" role="status">
              {t('checkout.fixCart')} <Link to={paths.cart()}>{t('checkout.reviewCart')}</Link>
            </p>
          )}
          {error !== null && <ErrorMessage error={error} />}
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void placeOrder()}
            disabled={submitting || blocked} aria-busy={submitting}>
            {submitting && <span className="spinner" aria-hidden="true" />}
            {submitting ? t('checkout.placing') : t('checkout.place', { total })}
          </button>
        </CartSummary>
      </div>
    </div>
  );
}

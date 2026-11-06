import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClipboardList, RefreshCw, Search, Store, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { Modal } from '../components/common/Modal.tsx';
import { Skeleton } from '../components/common/Skeleton.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { DishEditor } from '../components/owner/DishEditor.tsx';
import { OwnerOrderList } from '../components/owner/OwnerOrderList.tsx';
import type { OrderActions } from '../components/owner/OwnerOrderList.tsx';
import { invalidateMenu } from '../hooks/useMenu.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { usePolling } from '../hooks/usePolling.ts';
import { ApiError } from '../services/api.ts';
import { api } from '../services/client.ts';
import type { MenuItem, MenuItemChanges, Order, OrderStatus, OwnedRestaurant, RejectReason } from '../types/api.ts';
import { t } from '../utils/i18n.ts';
import { categoryName, groupByCategory, matchesQuery } from '../utils/menu.ts';
import { REJECT_REASONS, splitOrders } from '../utils/orderStatus.ts';

const REFRESH_MS = 20_000;

/** Owner dashboard (DEC-015, RESTAURANT_OWNER only): the restaurant's menu and its incoming orders. */
export function KitchenPage() {
  usePageMeta(t('kitchen.metaTitle'));
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'orders' ? 'orders' : 'menu';
  const [restaurants, setRestaurants] = useState<OwnedRestaurant[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    api.listOwnedRestaurants().then((list) => active && setRestaurants(list), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [attempt]);

  const restaurant = restaurants?.[0] ?? null;

  if (restaurants?.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon={Store} title={t('kitchen.noRestaurantTitle')} text={t('kitchen.noRestaurantText')} />
      </div>
    );
  }

  return (
    <div className="container page">
      <header className="page-header page-header-row">
        <div>
          <div className="eyebrow">{t('kitchen.eyebrow')}</div>
          <h1 className="page-title">{restaurant?.name ?? t('kitchen.title')}</h1>
          {restaurant && !restaurant.active && <p className="notice">{t('kitchen.inactive')}</p>}
        </div>
        <div className="tabs" role="tablist" aria-label={t('kitchen.title')}>
          {(['menu', 'orders'] as const).map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} className={`tab${tab === name ? ' is-active' : ''}`}
              onClick={() => setParams(name === 'menu' ? {} : { tab: name }, { replace: true })}>
              {name === 'menu' ? <UtensilsCrossed size={16} aria-hidden="true" /> : <ClipboardList size={16} aria-hidden="true" />}
              {t(`kitchen.tabs.${name}`)}
            </button>
          ))}
        </div>
      </header>
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {restaurants === null && error === null && <Skeleton className="skeleton-block" />}
      {restaurant && (tab === 'menu' ? <MenuTab restaurant={restaurant} /> : <OrdersTab />)}
    </div>
  );
}

function MenuTab({ restaurant }: { restaurant: OwnedRestaurant }) {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [soldOutOnly, setSoldOutOnly] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    api.getOwnerMenu(restaurant.id).then((menu) => active && setItems(menu.items), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [restaurant.id]);

  async function save(item: MenuItem, changes: MenuItemChanges) {
    setBusyId(item.id);
    setSaveError(null);
    try {
      const updated = await api.updateMenuItem(restaurant.id, item.id, changes);
      setItems((list) => list?.map((i) => (i.id === updated.id ? updated : i)) ?? null);
      invalidateMenu(); // customers' pages load the new menu next time
      toast(changes.available === undefined ? t('kitchen.saved', { name: updated.name })
        : t(updated.available ? 'kitchen.nowAvailable' : 'kitchen.nowSoldOut', { name: updated.name }));
    } catch (e) {
      setSaveError(e);
      throw e;
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(() => (items ?? []).filter((i) => matchesQuery(i, query) && (!soldOutOnly || !i.available)), [items, query, soldOutOnly]);
  const soldOutCount = items?.filter((i) => !i.available).length ?? 0;

  if (error !== null) {
    return <ErrorMessage error={error} />;
  }
  if (items === null) {
    return <div className="owner-dishes">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="skeleton-row" />)}</div>;
  }
  return (
    <>
      <div className="owner-toolbar">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('kitchen.searchPlaceholder')} aria-label={t('kitchen.searchPlaceholder')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={soldOutOnly} onChange={(e) => setSoldOutOnly(e.target.checked)} />
          {t('kitchen.soldOutOnly', { count: soldOutCount })}
        </label>
      </div>
      {saveError !== null && <ErrorMessage error={saveError} />}
      {groupByCategory(visible).map((section) => (
        <section key={section.category} className="owner-section" aria-labelledby={`k-${section.category}`}>
          <h2 id={`k-${section.category}`} className="owner-section-title">{categoryName(section.category)}</h2>
          <ul className="owner-dishes">
            {section.items.map((item) => (
              <DishEditor key={item.id} item={item} busy={busyId === item.id} onSave={(changes) => save(item, changes)} />
            ))}
          </ul>
        </section>
      ))}
      {visible.length === 0 && <p className="muted">{t('menu.noMatchesTitle')}</p>}
    </>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [view, setView] = useState<'active' | 'history'>('active');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api.listOwnerOrders());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  usePolling(() => void load(), REFRESH_MS, true);

  async function move(order: Order, to: OrderStatus, reason?: RejectReason) {
    setBusyId(order.id);
    setActionError(null);
    try {
      const updated = await api.updateOrderStatus(order.id, { from: order.status as OrderStatus, status: to, reason });
      setOrders((list) => list?.map((o) => (o.id === updated.id ? { ...updated, history: undefined } : o)) ?? null);
      toast(t(`kitchen.moved.${to}`, { id: order.id.slice(0, 8).toUpperCase() }));
    } catch (e) {
      setActionError(e);
      if (e instanceof ApiError && e.status === 409) {
        void load(); // someone else (or another tab) changed it: show the current state
      }
    } finally {
      setBusyId(null);
    }
  }

  const { active, history } = splitOrders(orders ?? []);
  const actions: OrderActions = {
    onAccept: (order) => void move(order, 'ACCEPTED'),
    onReject: (order) => setRejecting(order),
    onAdvance: (order, to) => void move(order, to),
    busyId,
  };

  return (
    <>
      <div className="owner-toolbar">
        <div className="segmented" role="tablist" aria-label={t('kitchen.tabs.orders')}>
          {(['active', 'history'] as const).map((name) => (
            <button key={name} type="button" role="tab" aria-selected={view === name}
              className={`segment${view === name ? ' is-active' : ''}`} onClick={() => setView(name)}>
              {t(`kitchen.views.${name}`, { count: (name === 'active' ? active : history).length })}
            </button>
          ))}
        </div>
        <div className="owner-toolbar-right">
          <span className="muted small">{t('kitchen.autoRefresh')}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'spin' : undefined} /> {t('kitchen.refresh')}
          </button>
        </div>
      </div>
      {error !== null && <ErrorMessage error={error} onRetry={() => void load()} />}
      {actionError !== null && <ErrorMessage error={actionError} />}
      {orders === null && error === null && <div className="owner-orders">{[0, 1].map((i) => <Skeleton key={i} className="skeleton-row" />)}</div>}
      {orders && (view === 'active'
        ? <OwnerOrderList orders={active} allOrders={orders} actions={actions} />
        : <OwnerOrderList orders={history} allOrders={orders} emptyTitle={t('kitchen.noHistoryTitle')} emptyText={t('kitchen.noHistoryText')} />)}
      <RejectDialog order={rejecting} onCancel={() => setRejecting(null)}
        onConfirm={(reason) => { const order = rejecting; setRejecting(null); if (order) void move(order, 'REJECTED', reason); }} />
    </>
  );
}

/** Asks for an optional reason before rejecting (DEC-016); the customer sees the reason. */
function RejectDialog({ order, onCancel, onConfirm }: {
  order: Order | null; onCancel: () => void; onConfirm: (reason?: RejectReason) => void;
}) {
  const titleId = useId();
  const [reason, setReason] = useState<RejectReason | ''>('');
  return (
    <Modal open={order !== null} onClose={onCancel} labelledBy={titleId} className="confirm">
      <h2 id={titleId} className="confirm-title">{t('kitchen.reject.title', { id: order?.id.slice(0, 8).toUpperCase() ?? '' })}</h2>
      <p className="confirm-text">{t('kitchen.reject.text')}</p>
      <fieldset className="reason-options">
        <legend className="field-label">{t('kitchen.reject.reasonLabel')}</legend>
        {(['', ...REJECT_REASONS] as const).map((value) => (
          <label key={value || 'none'} className="check">
            <input type="radio" name="reject-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
            {value ? t(`order.rejectReasons.${value}`) : t('kitchen.reject.noReason')}
          </label>
        ))}
      </fieldset>
      <div className="confirm-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} autoFocus>{t('kitchen.reject.keep')}</button>
        <button type="button" className="btn btn-danger" onClick={() => { onConfirm(reason || undefined); setReason(''); }}>
          {t('kitchen.reject.confirm')}
        </button>
      </div>
    </Modal>
  );
}

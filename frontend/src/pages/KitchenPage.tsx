import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClipboardList, RefreshCw, Search, Store, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { Skeleton } from '../components/common/Skeleton.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { DishEditor } from '../components/owner/DishEditor.tsx';
import { OwnerOrderList } from '../components/owner/OwnerOrderList.tsx';
import { invalidateMenu } from '../hooks/useMenu.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { api } from '../services/client.ts';
import type { MenuItem, MenuItemChanges, Order, OwnedRestaurant } from '../types/api.ts';
import { t } from '../utils/i18n.ts';
import { categoryName, groupByCategory, matchesQuery } from '../utils/menu.ts';

const REFRESH_MS = 30_000;

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
  const [loading, setLoading] = useState(false);

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
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <>
      <div className="owner-toolbar">
        <p className="muted small">{t('kitchen.autoRefresh')}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" className={loading ? 'spin' : undefined} /> {t('kitchen.refresh')}
        </button>
      </div>
      {error !== null && <ErrorMessage error={error} onRetry={() => void load()} />}
      {orders === null && error === null && <div className="owner-orders">{[0, 1].map((i) => <Skeleton key={i} className="skeleton-row" />)}</div>}
      {orders && <OwnerOrderList orders={orders} />}
    </>
  );
}

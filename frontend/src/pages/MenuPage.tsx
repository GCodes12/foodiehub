import { useSearchParams } from 'react-router';
import { Store, Tag, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { DishCardSkeleton } from '../components/common/Skeleton.tsx';
import { DishDetail } from '../components/menu/DishDetail.tsx';
import { MenuBrowser } from '../components/menu/MenuBrowser.tsx';
import { useMenu } from '../hooks/useMenu.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { t } from '../utils/i18n.ts';
import { LABEL_FILTERS } from '../utils/menu.ts';
import type { DietFilter, LabelFilter, MenuFilters, SortMode } from '../utils/menu.ts';

const DIETS = ['ALL', 'VEG', 'EGG', 'NON_VEG'];
const SORTS = ['RECOMMENDED', 'PRICE_ASC', 'PRICE_DESC'];

/** Explore Menu. Filters, sort and the open dish live in the URL, so they survive refresh and can be shared. */
export function MenuPage() {
  usePageMeta(t('menu.metaTitle'), t('menu.subtitle'));
  const menu = useMenu();
  const [params, setParams] = useSearchParams();

  const filters: MenuFilters = {
    query: params.get('q') ?? '',
    category: params.get('category'),
    diet: (DIETS.includes(params.get('diet') ?? '') ? params.get('diet') : 'ALL') as DietFilter,
    label: (LABEL_FILTERS as readonly string[]).includes(params.get('label') ?? '') ? params.get('label') as LabelFilter : null,
  };
  const sort = (SORTS.includes(params.get('sort') ?? '') ? params.get('sort') : 'RECOMMENDED') as SortMode;

  function update(changes: Record<string, string | null>, replace = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '' || value === 'ALL' || value === 'RECOMMENDED') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setParams(next, { replace });
  }

  const dishId = params.get('dish');
  const openDish = menu.status === 'ready' ? menu.data.items.find((i) => i.id === dishId) ?? null : null;

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-title">{t('menu.title')}</h1>
        <p className="page-subtitle">{t('menu.subtitle')}</p>
        <div className="info-chips">
          <span className="info-chip"><Store size={14} aria-hidden="true" />{t('menu.pickupOnly')}</span>
          <span className="info-chip"><Tag size={14} aria-hidden="true" />{t('menu.pricesInInr')}</span>
        </div>
      </header>

      {menu.status === 'loading' && (
        <div className="dish-grid" aria-label={t('menu.loading')}>{[0, 1, 2, 3, 4, 5].map((i) => <DishCardSkeleton key={i} />)}</div>
      )}
      {menu.status === 'error' && (
        <EmptyState icon={UtensilsCrossed} title={t('menu.unavailableTitle')}>
          <ErrorMessage error={menu.error} onRetry={menu.reload} />
        </EmptyState>
      )}
      {menu.status === 'ready' && (
        <>
          <MenuBrowser items={menu.data.items} restaurantId={menu.data.restaurant.id} filters={filters} sort={sort}
            onFilters={(f) => update({ q: f.query, category: f.category, diet: f.diet, label: f.label ?? null })}
            onSort={(s) => update({ sort: s })}
            onOpen={(item) => update({ dish: item.id }, false)} />
          <DishDetail item={openDish} restaurantId={menu.data.restaurant.id} onClose={() => update({ dish: null })} />
        </>
      )}
    </div>
  );
}

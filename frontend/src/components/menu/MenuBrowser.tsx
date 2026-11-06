import { SearchX } from 'lucide-react';
import type { MenuItem } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { categoriesOf, categoryBlurb, categoryName, filterItems, groupByCategory, hasDietData, NO_FILTERS, sortItems } from '../../utils/menu.ts';
import type { MenuFilters, SortMode } from '../../utils/menu.ts';
import { DishList } from './DishList.tsx';
import { MenuToolbar } from './MenuToolbar.tsx';

interface Props {
  items: MenuItem[];
  restaurantId: string;
  filters: MenuFilters;
  sort: SortMode;
  onFilters: (filters: MenuFilters) => void;
  onSort: (sort: SortMode) => void;
  onOpen: (item: MenuItem) => void;
}

/** The menu: toolbar, then dishes grouped by category (or one flat list when sorted by price). */
export function MenuBrowser({ items, restaurantId, filters, sort, onFilters, onSort, onOpen }: Props) {
  const visible = sortItems(filterItems(items, filters), sort);
  const grouped = sort === 'RECOMMENDED';
  return (
    <>
      <MenuToolbar categories={categoriesOf(items)} showDiet={hasDietData(items)} filters={filters} sort={sort} onFilters={onFilters} onSort={onSort} />
      <p className="result-count" aria-live="polite">{t('menu.resultCount', { count: visible.length })}</p>
      {visible.length === 0 ? (
        <div className="no-results">
          <SearchX size={36} strokeWidth={1.5} aria-hidden="true" />
          <h2>{t('menu.noMatchesTitle')}</h2>
          <p>{t('menu.noMatchesText')}</p>
          <button type="button" className="btn btn-secondary" onClick={() => onFilters(NO_FILTERS)}>
            {t('menu.clearFilters')}
          </button>
        </div>
      ) : grouped ? (
        groupByCategory(visible).map((section) => (
          <section key={section.category} className="menu-section" aria-labelledby={`cat-${section.category}`}>
            <div className="menu-section-head">
              <h2 id={`cat-${section.category}`} className="menu-section-title">{categoryName(section.category)}</h2>
              {categoryBlurb(section.category) && <span className="menu-section-blurb">{categoryBlurb(section.category)}</span>}
            </div>
            <DishList items={section.items} restaurantId={restaurantId} onOpen={onOpen} />
          </section>
        ))
      ) : (
        <DishList items={visible} restaurantId={restaurantId} onOpen={onOpen} />
      )}
    </>
  );
}

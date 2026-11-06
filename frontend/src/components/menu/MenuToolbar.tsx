import { ArrowUpDown, Award, ChefHat, Search, Sparkles, X } from 'lucide-react';
import type { Diet } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { categoryName } from '../../utils/menu.ts';
import type { DietFilter, LabelFilter, MenuFilters, SortMode } from '../../utils/menu.ts';
import { DietMark } from '../common/DietMark.tsx';

const DIETS: DietFilter[] = ['ALL', 'VEG', 'EGG', 'NON_VEG'];
const SORTS: SortMode[] = ['RECOMMENDED', 'PRICE_ASC', 'PRICE_DESC'];

const LABEL_ICONS: Record<LabelFilter, typeof Award> = { BESTSELLER: Award, CHEF_SPECIAL: ChefHat, SIGNATURE: Sparkles };

interface Props {
  categories: string[];
  /** false when the menu has no diet data: the diet filter could only ever show "no results". */
  showDiet?: boolean;
  filters: MenuFilters;
  sort: SortMode;
  onFilters: (filters: MenuFilters) => void;
  onSort: (sort: SortMode) => void;
}

/** Search, category chips, diet filter and price sort. Purely controlled: the page owns the state (in the URL). */
export function MenuToolbar({ categories, showDiet = true, filters, sort, onFilters, onSort }: Props) {
  const LabelIcon = filters.label ? LABEL_ICONS[filters.label] : null;
  return (
    <div className="menu-toolbar">
      <div className="menu-toolbar-row">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={filters.query} placeholder={t('menu.searchPlaceholder')} aria-label={t('menu.searchLabel')}
            onChange={(e) => onFilters({ ...filters, query: e.target.value })} />
          {filters.query && (
            <button type="button" className="icon-button" onClick={() => onFilters({ ...filters, query: '' })} aria-label={t('menu.clearSearch')}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        {showDiet && <div className="segmented" role="group" aria-label={t('menu.dietLabel')}>
          {DIETS.map((diet) => (
            <button key={diet} type="button" aria-pressed={filters.diet === diet}
              className={`segment${filters.diet === diet ? ' is-active' : ''}`} onClick={() => onFilters({ ...filters, diet })}>
              {diet !== 'ALL' && <DietMark diet={diet as Diet} size={13} />}
              {diet === 'ALL' ? t('menu.dietAll') : t(`diet.${diet}`)}
            </button>
          ))}
        </div>}
        <label className="sort">
          <ArrowUpDown size={16} aria-hidden="true" />
          <span className="visually-hidden">{t('menu.sortLabel')}</span>
          <select value={sort} onChange={(e) => onSort(e.target.value as SortMode)} aria-label={t('menu.sortLabel')}>
            {SORTS.map((mode) => <option key={mode} value={mode}>{t(`menu.sort.${mode}`)}</option>)}
          </select>
        </label>
      </div>
      {filters.label && LabelIcon && (
        <div className="active-filter">
          <span className="active-filter-pill">
            <LabelIcon size={15} aria-hidden="true" />{t(`menu.labels.${filters.label}`)}
            <button type="button" className="icon-button" onClick={() => onFilters({ ...filters, label: null })}
              aria-label={t('menu.removeFilter', { name: t(`menu.labels.${filters.label}`) })}>
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
      <nav className="category-chips" aria-label={t('menu.categoriesLabel')}>
        <button type="button" aria-pressed={filters.category === null}
          className={`chip${filters.category === null ? ' is-active' : ''}`} onClick={() => onFilters({ ...filters, category: null })}>
          {t('menu.allCategories')}
        </button>
        {categories.map((code) => (
          <button key={code} type="button" aria-pressed={filters.category === code}
            className={`chip${filters.category === code ? ' is-active' : ''}`} onClick={() => onFilters({ ...filters, category: code })}>
            {categoryName(code)}
          </button>
        ))}
      </nav>
    </div>
  );
}

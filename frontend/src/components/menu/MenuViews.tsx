import { Link } from 'react-router';
import { ArrowRight, Check, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { viewDishCount, viewHighlights } from '../../utils/menu.ts';
import type { MenuView } from '../../utils/menu.ts';
import { paths } from '../../utils/paths.ts';
import { DietMark } from '../common/DietMark.tsx';
import { DishImage } from '../common/DishImage.tsx';

const SLUG: Record<Exclude<MenuView, 'ALL'>, 'veg' | 'non-veg'> = { VEG: 'veg', NON_VEG: 'non-veg' };

function viewClass(view: MenuView): string {
  return view === 'VEG' ? 'veg' : view === 'NON_VEG' ? 'non-veg' : 'all';
}

/** Three overlapping round pictures of the view's signature dishes (photos when present, otherwise illustrations). */
function Collage({ dishes }: { dishes: MenuItem[] }) {
  return (
    <span className="menu-view-collage" aria-hidden="true">
      {dishes.map((dish) => (
        <span key={dish.id} className="menu-view-plate">
          <DishImage name={dish.name} imageKey={dish.imageKey} category={dish.category} />
        </span>
      ))}
    </span>
  );
}

function ViewMark({ view }: { view: MenuView }) {
  return view === 'ALL'
    ? <UtensilsCrossed size={16} aria-hidden="true" />
    : <DietMark diet={view === 'VEG' ? 'VEG' : 'NON_VEG'} size={16} />;
}

/** Menu page: switch between the full, veg and non-veg menu (controlled; the page keeps the choice in the URL). */
export function MenuViewSwitcher({ items, view, onChange }: { items: MenuItem[]; view: MenuView; onChange: (view: MenuView) => void }) {
  const views: MenuView[] = ['ALL', 'VEG', 'NON_VEG'];
  return (
    <div className="menu-views" role="group" aria-label={t('menuViews.label')}>
      {views.map((v) => {
        const active = v === view;
        return (
          <button key={v} type="button" aria-pressed={active} onClick={() => onChange(v)}
            className={`menu-view menu-view-${viewClass(v)}${active ? ' is-active' : ''}`}>
            <Collage dishes={viewHighlights(items, v)} />
            <span className="menu-view-text">
              <span className="menu-view-title"><ViewMark view={v} />{t(`menuViews.${v}.title`)}</span>
              <span className="menu-view-count">{t(`menuViews.${v}.count`, { count: viewDishCount(items, v) })}</span>
              <span className="menu-view-note">{t(`menuViews.${v}.note`)}</span>
            </span>
            {active && <span className="menu-view-check"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>}
          </button>
        );
      })}
    </div>
  );
}

/** Home page: two large entry cards, one for the veg menu and one for the non-veg menu. */
export function MenuViewCards({ items }: { items: MenuItem[] }) {
  const views: Exclude<MenuView, 'ALL'>[] = ['VEG', 'NON_VEG'];
  return (
    <ul className="menu-view-cards">
      {views.map((v) => (
        <li key={v}>
          <Link to={paths.menu({ menu: SLUG[v] })} className={`menu-view-card menu-view-${viewClass(v)}`}>
            <span className="menu-view-card-text">
              <span className="menu-view-card-kicker"><ViewMark view={v} />{t(`menuViews.${v}.kicker`)}</span>
              <span className="menu-view-card-title">{t(`menuViews.${v}.title`)}</span>
              <span className="menu-view-card-desc">{t(`menuViews.${v}.description`)}</span>
              <span className="menu-view-card-cta">
                {t('menuViews.open', { count: viewDishCount(items, v) })} <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
            <Collage dishes={viewHighlights(items, v)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function viewFromSlug(slug: string | null): MenuView {
  return slug === 'veg' ? 'VEG' : slug === 'non-veg' ? 'NON_VEG' : 'ALL';
}

export function slugFromView(view: MenuView): 'veg' | 'non-veg' | null {
  return view === 'ALL' ? null : SLUG[view];
}

import { Link } from 'react-router';
import { ArrowRight, Clock, CookingPot, Quote, Sparkles, Tag } from 'lucide-react';
import { DishCardSkeleton } from '../components/common/Skeleton.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { Logo } from '../components/common/Logo.tsx';
import { SectionHeader } from '../components/common/SectionHeader.tsx';
import { CategoryTiles } from '../components/menu/CategoryTiles.tsx';
import { DishList } from '../components/menu/DishList.tsx';
import { MenuViewCards } from '../components/menu/MenuViews.tsx';
import { useMenu } from '../hooks/useMenu.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import type { MenuItem } from '../types/api.ts';
import { images } from '../utils/images.ts';
import { t } from '../utils/i18n.ts';
import { hasDietData, homeSelections } from '../utils/menu.ts';
import { paths } from '../utils/paths.ts';

const ROWS: { field: keyof ReturnType<typeof homeSelections>; title: string; subtitle: string; id: string; viewAll: string }[] = [
  { field: 'signature', title: 'home.signatureTitle', subtitle: 'home.signatureSubtitle', id: 'signature', viewAll: paths.menu({ label: 'SIGNATURE' }) },
  { field: 'bestsellers', title: 'home.bestsellersTitle', subtitle: 'home.bestsellersSubtitle', id: 'bestsellers', viewAll: paths.menu({ label: 'BESTSELLER' }) },
  { field: 'vegFavourites', title: 'home.vegTitle', subtitle: 'home.vegSubtitle', id: 'veg', viewAll: paths.menu({ menu: 'veg' }) },
  { field: 'nonVegFavourites', title: 'home.nonVegTitle', subtitle: 'home.nonVegSubtitle', id: 'non-veg', viewAll: paths.menu({ menu: 'non-veg' }) },
  { field: 'startersAndSides', title: 'home.sidesTitle', subtitle: 'home.sidesSubtitle', id: 'sides', viewAll: paths.menu({ category: 'STARTERS' }) },
  { field: 'combos', title: 'home.combosTitle', subtitle: 'home.combosSubtitle', id: 'combos', viewAll: paths.menu({ category: 'COMBOS' }) },
];

const REVIEWS = ['r1', 'r2', 'r3'];

export function HomePage() {
  usePageMeta(t('home.metaTitle'));
  const menu = useMenu();
  const hero = images.hero();

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow eyebrow-gold">{t('home.eyebrow')}</div>
            <h1 className="hero-title">{t('home.title')}</h1>
            <p className="hero-subtitle">{t('home.subtitle')}</p>
            <div className="hero-actions">
              <Link to={paths.menu()} className="btn btn-primary btn-lg">
                {t('home.ctaMenu')} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#signature" className="btn btn-outline-gold btn-lg">
                <Sparkles size={18} aria-hidden="true" /> {t('home.ctaSpecials')}
              </a>
            </div>
            <ul className="hero-highlights">
              <li><CookingPot size={18} aria-hidden="true" />{t('home.highlights.dum')}</li>
              <li><Clock size={18} aria-hidden="true" />{t('home.highlights.pickup')}</li>
              <li><Tag size={18} aria-hidden="true" />{t('home.highlights.prices')}</li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="hero-arch">
              {hero ? <img src={hero} alt={t('home.heroAlt')} /> : <CookingPot size={96} strokeWidth={1} aria-hidden="true" />}
            </div>
            <div className="hero-badge"><Logo variant="full" /></div>
          </div>
        </div>
      </section>

      {menu.status === 'error' && (
        <div className="container section"><ErrorMessage error={menu.error} onRetry={menu.reload} /></div>
      )}

      {menu.status === 'ready' && hasDietData(menu.data.items) && (
        <section className="container section menu-views-section" aria-labelledby="choose-menu">
          <SectionHeader id="choose-menu" title={t('menuViews.homeTitle')} subtitle={t('menuViews.homeSubtitle')} />
          <MenuViewCards items={menu.data.items} />
        </section>
      )}

      <section className="container section" aria-labelledby="categories">
        <SectionHeader id="categories" title={t('home.categoriesTitle')} subtitle={t('home.categoriesSubtitle')} />
        {menu.status === 'ready' ? <CategoryTiles items={menu.data.items} /> : menu.status === 'loading' && <RowSkeleton />}
      </section>

      {ROWS.map((row, index) => (
        <HomeRow key={row.field} {...row} alt={index % 2 === 1} menu={menu} />
      ))}

      <section className="story-teaser">
        <div className="container story-teaser-inner">
          <div>
            <div className="eyebrow eyebrow-gold">{t('story.eyebrow')}</div>
            <h2 className="story-teaser-title">{t('home.storyTitle')}</h2>
            <p className="story-teaser-text">{t('home.storyText')}</p>
            <Link to={paths.story()} className="btn btn-gold">{t('home.storyCta')} <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <CookingPot className="story-teaser-art" size={160} strokeWidth={0.8} aria-hidden="true" />
        </div>
      </section>

      <section className="container section" aria-labelledby="reviews">
        <SectionHeader id="reviews" title={t('home.reviewsTitle')} />
        <p className="sample-note" role="note">{t('home.reviewsSample')}</p>
        <ul className="reviews">
          {REVIEWS.map((r) => (
            <li key={r} className="review">
              <Quote className="review-quote" size={28} aria-hidden="true" />
              <p className="review-text">{t(`home.reviews.${r}Text`)}</p>
              <span className="review-name">{t(`home.reviews.${r}Name`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function RowSkeleton() {
  return <div className="dish-rail">{[0, 1, 2, 3].map((i) => <DishCardSkeleton key={i} />)}</div>;
}

function HomeRow({ field, title, subtitle, id, viewAll, alt, menu }: (typeof ROWS)[number] & {
  alt: boolean; menu: ReturnType<typeof useMenu>;
}) {
  let items: MenuItem[] = [];
  if (menu.status === 'ready') {
    items = homeSelections(menu.data.items)[field];
    if (items.length === 0) {
      return null; // nothing real to show: the row is left out rather than filled with invented dishes
    }
  }
  if (menu.status === 'error') {
    return null;
  }
  return (
    <section className={`section-band${alt ? ' section-band-alt' : ''}`} aria-labelledby={id}>
      <div className="container">
        <SectionHeader id={id} title={t(title)} subtitle={t(subtitle)}
          action={<Link to={viewAll} className="link-arrow">{t('home.viewAll')} <ArrowRight size={16} aria-hidden="true" /></Link>} />
        {menu.status === 'ready' ? <DishList items={items} restaurantId={menu.data.restaurant.id} layout="rail" /> : <RowSkeleton />}
      </div>
    </section>
  );
}

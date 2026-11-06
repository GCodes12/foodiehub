import { Link } from 'react-router';
import { ArrowRight, CookingPot, HandHeart, Leaf, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '../components/common/Logo.tsx';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { t } from '../utils/i18n.ts';
import { paths } from '../utils/paths.ts';

const PILLARS: { icon: LucideIcon; key: string }[] = [
  { icon: CookingPot, key: 'dum' },
  { icon: Sparkles, key: 'spices' },
  { icon: Leaf, key: 'fresh' },
  { icon: HandHeart, key: 'promise' },
];

export function OurStoryPage() {
  usePageMeta(t('story.metaTitle'), t('story.intro'));
  return (
    <>
      <section className="story-hero">
        <div className="container story-hero-inner">
          <Logo variant="full" className="story-logo" />
          <div className="eyebrow eyebrow-gold">{t('story.eyebrow')}</div>
          <h1 className="story-title">{t('story.title')}</h1>
          <p className="story-intro">{t('story.intro')}</p>
        </div>
      </section>
      <section className="container section">
        <ul className="pillars">
          {PILLARS.map(({ icon: Icon, key }) => (
            <li key={key} className="pillar">
              <span className="pillar-icon"><Icon size={26} strokeWidth={1.6} aria-hidden="true" /></span>
              <h2 className="pillar-title">{t(`story.${key}Title`)}</h2>
              <p className="pillar-text">{t(`story.${key}Text`)}</p>
            </li>
          ))}
        </ul>
        <div className="story-cta">
          <Link to={paths.menu()} className="btn btn-primary btn-lg">{t('story.cta')} <ArrowRight size={18} aria-hidden="true" /></Link>
          <p className="muted small">{t('story.note')}</p>
        </div>
      </section>
    </>
  );
}

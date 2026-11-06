import { Link } from 'react-router';
import { Store } from 'lucide-react';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';
import { Logo } from '../common/Logo.tsx';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo variant="full" className="footer-logo" />
          <p className="footer-about">{t('footer.about')}</p>
        </div>
        <nav className="footer-col" aria-label={t('footer.explore')}>
          <h2 className="footer-heading">{t('footer.explore')}</h2>
          <Link to={paths.home()}>{t('nav.home')}</Link>
          <Link to={paths.menu()}>{t('nav.menu')}</Link>
          <Link to={paths.story()}>{t('nav.story')}</Link>
        </nav>
        <nav className="footer-col" aria-label={t('footer.account')}>
          <h2 className="footer-heading">{t('footer.account')}</h2>
          <Link to={paths.cart()}>{t('nav.cart')}</Link>
          <Link to={paths.myOrders()}>{t('nav.myOrders')}</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span><Store size={14} aria-hidden="true" /> {t('footer.pickup')}</span>
        <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}

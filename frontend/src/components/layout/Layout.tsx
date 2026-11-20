import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { t } from '../../utils/i18n.ts';
import { Footer } from './Footer.tsx';
import { Navbar } from './Navbar.tsx';

/** Shared page frame. Scrolls to the top on page changes (but not when only the query string changes). */
export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <a href="#main" className="skip-link">{t('nav.skipToContent')}</a>
      <Navbar />
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

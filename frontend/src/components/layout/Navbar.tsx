import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BookOpen, ChefHat, ClipboardList, House, LogIn, LogOut, Menu as MenuIcon, ShieldCheck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hasRole, useAuth } from '../../context/AuthContext.tsx';
import type { Role } from '../../services/auth.ts';
import { useCart } from '../../context/CartContext.tsx';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';
import { Logo } from '../common/Logo.tsx';
import { Modal } from '../common/Modal.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Shown only to signed-in users with this role. */
  role?: Role;
}

const NAV: NavItem[] = [
  { to: paths.home(), label: 'nav.home', icon: House, end: true },
  { to: paths.menu(), label: 'nav.menu', icon: UtensilsCrossed },
  { to: paths.story(), label: 'nav.story', icon: BookOpen },
  { to: paths.myOrders(), label: 'nav.myOrders', icon: ClipboardList, role: 'CUSTOMER' },
  { to: paths.kitchen(), label: 'nav.kitchen', icon: ChefHat, role: 'RESTAURANT_OWNER' },
  { to: paths.admin(), label: 'nav.admin', icon: ShieldCheck, role: 'ADMIN' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const auth = useAuth();
  return (
    <>
      {NAV.filter((item) => !item.role || hasRole(auth, item.role)).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
          <Icon size={18} aria-hidden="true" />
          <span>{t(label)}</span>
        </NavLink>
      ))}
    </>
  );
}

function Account({ compact = false }: { compact?: boolean }) {
  const auth = useAuth();
  if (!auth.available && !auth.signedIn) {
    return compact ? null : <span className="nav-muted">{t('nav.signInUnavailable')}</span>;
  }
  if (auth.signedIn) {
    const name = auth.displayName ?? auth.username ?? '';
    return (
      <div className="account">
        <span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        <span className="account-name" title={t('nav.profile', { name })}>{name}</span>
        <button type="button" className="icon-button account-logout" onClick={auth.logout}
          aria-label={t('nav.logout')} title={t('nav.logout')}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <button type="button" className="btn btn-gold btn-sm" onClick={() => auth.login()}>
      <LogIn size={16} aria-hidden="true" />{t('nav.login')}
    </button>
  );
}

export function Navbar() {
  const { count } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const drawerTitle = useId();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to={paths.home()} className="navbar-brand" aria-label={t('nav.homeAria')}>
          <Logo />
        </Link>
        <nav className="navbar-links" aria-label={t('nav.main')}>
          <NavLinks />
        </nav>
        <div className="navbar-actions">
          <Link to={paths.cart()} className="cart-button" aria-label={t('nav.cartAria', { count })}>
            <ShoppingBag size={20} aria-hidden="true" />
            {count > 0 && <span className="cart-count" data-testid="cart-count">{count}</span>}
          </Link>
          <div className="navbar-account"><Account /></div>
          <button type="button" className="icon-button navbar-toggle" onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')} aria-expanded={drawerOpen}>
            <MenuIcon size={24} aria-hidden="true" />
          </button>
        </div>
      </div>
      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} labelledBy={drawerTitle} variant="drawer">
        <div className="drawer">
          <div id={drawerTitle} className="drawer-brand"><Logo /></div>
          <nav className="drawer-links" aria-label={t('nav.main')}>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </nav>
          <div className="drawer-account"><Account /></div>
        </div>
      </Modal>
    </header>
  );
}

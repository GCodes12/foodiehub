import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, Store, Users } from 'lucide-react';
import type { StatCard } from '../../utils/admin.ts';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';

/** Page frame for every administrator page: eyebrow, title, section tabs, optional actions. */
export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const tabs = [
    { to: paths.admin(), label: 'admin.nav.dashboard', icon: LayoutDashboard, end: true },
    { to: paths.adminRestaurants(), label: 'admin.nav.restaurants', icon: Store, end: false },
    { to: paths.adminOwners(), label: 'admin.nav.owners', icon: Users, end: false },
    { to: paths.adminOrders(), label: 'admin.nav.orders', icon: ClipboardList, end: false },
  ];
  return (
    <div className="container page">
      <header className="page-header page-header-row">
        <div>
          <div className="eyebrow">{t('admin.eyebrow')}</div>
          <h1 className="page-title">{title}</h1>
        </div>
        {actions}
      </header>
      <nav className="tabs admin-tabs" aria-label={t('admin.nav.label')}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            <Icon size={16} aria-hidden="true" /> {t(label)}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

/** Summary cards; a missing value shows a dash, never an invented number. */
export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <dl className="owner-stats admin-stats">
      {cards.map((card) => (
        <div key={card.key} className="owner-stat">
          <dt>{t(card.label)}</dt>
          <dd data-testid={`stat-${card.key}`}>{card.value === null ? '—' : card.value.toLocaleString('en-IN')}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav className="pagination" aria-label={t('admin.pagination.label')}>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} aria-hidden="true" /> {t('admin.pagination.previous')}
      </button>
      <span className="muted small">{t('admin.pagination.status', { page: page + 1, total: totalPages })}</span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        {t('admin.pagination.next')} <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

/** Active / inactive marker for a restaurant. */
export function ActiveBadge({ active }: { active: boolean }) {
  return <span className={`badge status-badge ${active ? 'status-accepted' : 'status-rejected'}`}>
    {t(active ? 'admin.restaurant.active' : 'admin.restaurant.inactive')}</span>;
}

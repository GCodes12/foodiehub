import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Store, TriangleAlert } from 'lucide-react';
import { ActiveBadge, AdminPage, Pagination } from '../../components/admin/AdminParts.tsx';
import { ErrorMessage } from '../../components/common/ErrorMessage.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { api } from '../../services/client.ts';
import type { AdminRestaurantSummary, PageResponse } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { paths } from '../../utils/paths.ts';

type Filter = 'all' | 'active' | 'inactive';
const PAGE_SIZE = 20;

/** All restaurants (DEC-017): search, active filter, pagination, owner and menu status at a glance. */
export function AdminRestaurantsPage() {
  usePageMeta(t('admin.restaurants.metaTitle'));
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PageResponse<AdminRestaurantSummary> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    api.listAdminRestaurants({ page, size: PAGE_SIZE, q: query || undefined, active: filter === 'all' ? undefined : filter === 'active' })
      .then((r) => active && setResult(r), (e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, [page, filter, query, attempt]);

  return (
    <AdminPage title={t('admin.restaurants.title')} actions={
      <Link to={paths.adminNewRestaurant()} className="btn btn-primary btn-sm"><Plus size={16} aria-hidden="true" /> {t('admin.restaurants.new')}</Link>}>
      <div className="owner-toolbar">
        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); setPage(0); setQuery(draft.trim()); }}>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('admin.restaurants.search')}
            aria-label={t('admin.restaurants.search')} />
        </form>
        <div className="segmented" role="tablist" aria-label={t('admin.restaurants.filter')}>
          {(['all', 'active', 'inactive'] as const).map((name) => (
            <button key={name} type="button" role="tab" aria-selected={filter === name} className={`segment${filter === name ? ' is-active' : ''}`}
              onClick={() => { setPage(0); setFilter(name); }}>
              {t(`admin.restaurants.filters.${name}`)}
            </button>
          ))}
        </div>
      </div>
      {error !== null && <ErrorMessage error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {result === null && error === null && <Skeleton className="skeleton-block" />}
      {result && <RestaurantTable restaurants={result.items} />}
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPage={setPage} />}
    </AdminPage>
  );
}

/** Exported for tests. */
export function RestaurantTable({ restaurants }: { restaurants: AdminRestaurantSummary[] }) {
  if (restaurants.length === 0) {
    return (
      <div className="no-results">
        <Store size={34} strokeWidth={1.5} aria-hidden="true" />
        <h2>{t('admin.restaurants.emptyTitle')}</h2>
        <p>{t('admin.restaurants.emptyText')}</p>
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>
          <th scope="col">{t('admin.table.restaurant')}</th><th scope="col">{t('admin.form.city')}</th>
          <th scope="col">{t('admin.table.status')}</th><th scope="col">{t('admin.table.owner')}</th>
          <th scope="col" className="num">{t('admin.table.dishes')}</th>
        </tr></thead>
        <tbody>
          {restaurants.map((r) => (
            <tr key={r.id}>
              <td><Link to={paths.adminRestaurant(r.id)}>{r.name}</Link></td>
              <td>{r.city ?? '—'}</td>
              <td><ActiveBadge active={r.active} /></td>
              <td>
                {!r.owner && <span className="muted">{t('admin.owner.none')}</span>}
                {r.owner && !r.owner.needsReassignment && r.owner.username}
                {r.owner?.needsReassignment && (
                  <span className="warning-text"><TriangleAlert size={14} aria-hidden="true" /> {t('admin.owner.needsReassignmentShort')}</span>
                )}
              </td>
              <td className="num">{t('admin.table.dishCount', { available: r.availableDishes, total: r.dishes })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { t } from '../utils/i18n.ts';
import { paths } from '../utils/paths.ts';

export function NotFoundPage() {
  usePageMeta(t('notFound.metaTitle'));
  return (
    <div className="container page">
      <EmptyState icon={Compass} title={t('notFound.title')} text={t('notFound.text')}>
        <Link to={paths.home()} className="btn btn-primary">{t('notFound.cta')}</Link>
        <Link to={paths.menu()} className="btn btn-secondary">{t('nav.menu')}</Link>
      </EmptyState>
    </div>
  );
}

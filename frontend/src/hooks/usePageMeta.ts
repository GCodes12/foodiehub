import { useEffect } from 'react';
import { t } from '../utils/i18n.ts';

/** Sets the browser title ("<page> · ZAYORA") and the meta description for the current page. */
export function usePageMeta(title: string | null, description?: string): void {
  useEffect(() => {
    const brand = t('app.name');
    document.title = title ? `${title} · ${brand}` : `${brand} — ${t('app.tagline')}`;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute('content', description ?? t('app.description'));
  }, [title, description]);
}

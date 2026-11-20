import { images } from '../../utils/images.ts';
import { t } from '../../utils/i18n.ts';

/**
 * The approved ZAYORA logo (src/assets/brand). `full` includes the tagline. It is designed for the burgundy brand
 * surfaces (navbar, footer, hero badge). Without the image file a clean text wordmark is shown instead.
 */
export function Logo({ variant = 'wordmark', className = '' }: { variant?: 'wordmark' | 'full'; className?: string }) {
  const src = variant === 'full' ? images.logo() : images.wordmark() ?? images.logo();
  if (src) {
    return <img src={src} alt={t('app.logoAlt')} className={`logo logo-${variant} ${className}`} decoding="async" />;
  }
  return (
    <span className={`logo-text logo-${variant} ${className}`} role="img" aria-label={t('app.logoAlt')}>
      <span className="logo-text-z">Z</span>AYORA
      {variant === 'full' && <span className="logo-text-tagline">{t('app.tagline')}</span>}
    </span>
  );
}

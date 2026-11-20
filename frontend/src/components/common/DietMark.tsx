import type { Diet } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';

/** The familiar Indian food mark: a square with a dot (veg, egg) or a triangle (non-veg). Nothing when unknown. */
export function DietMark({ diet, size = 16 }: { diet: Diet | null; size?: number }) {
  if (!diet) {
    return null;
  }
  return (
    <span className={`diet-mark diet-${diet.toLowerCase().replace('_', '-')}`} role="img" aria-label={t(`diet.${diet}`)}
      title={t(`diet.${diet}`)} style={{ width: size, height: size }}>
      <span className="diet-mark-symbol" />
    </span>
  );
}

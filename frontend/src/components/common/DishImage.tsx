import { artFor } from '../../utils/dishArt.ts';
import { images } from '../../utils/images.ts';
import { DishArt } from './DishArt.tsx';

interface Props {
  name: string;
  imageKey: string | null;
  category: string;
  className?: string;
  /** Decorative when the dish name is already next to the image. */
  decorative?: boolean;
}

/**
 * The dish photo from src/assets/dishes/<imageKey> when there is one; otherwise ZAYORA's own illustration of the dish
 * (components/common/DishArt.tsx), chosen by imageKey with a per-category fallback.
 */
export function DishImage({ name, imageKey, category, className = '', decorative = true }: Props) {
  const src = images.dish(imageKey);
  if (src) {
    return <img src={src} alt={decorative ? '' : name} className={`dish-image ${className}`} loading="lazy" decoding="async" />;
  }
  return <DishArt spec={artFor(imageKey, category)} seed={imageKey ?? `${category}:${name}`}
    className={`dish-image ${className}`} title={decorative ? undefined : name} />;
}

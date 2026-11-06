import { Link } from 'react-router';
import type { MenuItem } from '../../types/api.ts';
import { images } from '../../utils/images.ts';
import { t } from '../../utils/i18n.ts';
import { categoriesOf, categoryBlurb, categoryName, lowestPrice } from '../../utils/menu.ts';
import { formatRupees } from '../../utils/money.ts';
import { paths } from '../../utils/paths.ts';
import { categoryArt } from '../../utils/dishArt.ts';
import { DishArt } from '../common/DishArt.tsx';

/** "Browse by category": one tile per category in the real menu, linking to the filtered menu. */
export function CategoryTiles({ items }: { items: MenuItem[] }) {
  return (
    <ul className="category-tiles">
      {categoriesOf(items).map((code) => {
        const photo = images.category(code);
        const from = lowestPrice(items, code);
        return (
          <li key={code}>
            <Link to={paths.menu({ category: code })} className="category-tile">
              <span className={`category-tile-art category-art-${code.toLowerCase()}`} aria-hidden="true">
                {photo ? <img src={photo} alt="" loading="lazy" /> : <DishArt spec={categoryArt(code)} seed={code} />}
              </span>
              <span className="category-tile-name">{categoryName(code)}</span>
              {categoryBlurb(code) && <span className="category-tile-blurb">{categoryBlurb(code)}</span>}
              {from !== null && <span className="category-tile-price">{t('categories.from', { price: formatRupees(from) })}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

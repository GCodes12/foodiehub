import { Award, ChefHat, Plus } from 'lucide-react';
import type { MenuItem } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { DietMark } from '../common/DietMark.tsx';
import { DishImage } from '../common/DishImage.tsx';
import { QuantityStepper } from '../common/QuantityStepper.tsx';

export interface DishCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onQuantity: (quantity: number) => void;
  onOpen: () => void;
  variant?: 'grid' | 'rail';
}

export function DishLabels({ item }: { item: MenuItem }) {
  if (!item.bestseller && !item.chefSpecial) {
    return null;
  }
  return (
    <div className="dish-labels">
      {item.bestseller && <span className="label label-bestseller"><Award size={13} aria-hidden="true" />{t('dish.bestseller')}</span>}
      {item.chefSpecial && <span className="label label-chef"><ChefHat size={13} aria-hidden="true" />{t('dish.chefSpecial')}</span>}
    </div>
  );
}

/** A dish on the menu: photo, diet mark, labels, description, price and Add / quantity controls. */
export function DishCard({ item, quantity, onAdd, onQuantity, onOpen, variant = 'grid' }: DishCardProps) {
  return (
    <article className={`dish-card dish-card-${variant}${item.available ? '' : ' is-sold-out'}${quantity > 0 ? ' in-cart' : ''}`}>
      <button type="button" className="dish-card-media" onClick={onOpen} aria-label={t('dish.details', { name: item.name })}>
        <DishImage name={item.name} imageKey={item.imageKey} category={item.category} />
        {!item.available && <span className="sold-out-ribbon">{t('dish.soldOut')}</span>}
      </button>
      <div className="dish-card-body">
        <DishLabels item={item} />
        <h3 className="dish-card-title">
          <DietMark diet={item.diet} />
          <button type="button" className="dish-card-name" onClick={onOpen}>{item.name}</button>
        </h3>
        {item.description && <p className="dish-card-description">{item.description}</p>}
        <div className="dish-card-footer">
          <span className="price">{formatRupees(item.price)}</span>
          {!item.available ? (
            <span className="badge badge-muted">{t('dish.unavailable')}</span>
          ) : quantity > 0 ? (
            <QuantityStepper name={item.name} quantity={quantity} onChange={onQuantity} size="sm" />
          ) : (
            <button type="button" className="btn btn-add btn-sm" onClick={onAdd} aria-label={t('dish.addAria', { name: item.name })}>
              <Plus size={16} aria-hidden="true" />{t('dish.add')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

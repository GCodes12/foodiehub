import { useId, useState } from 'react';
import { ShoppingBag, Store } from 'lucide-react';
import { useAddToCart } from '../../hooks/useAddToCart.ts';
import type { MenuItem } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { categoryName } from '../../utils/menu.ts';
import { formatRupees } from '../../utils/money.ts';
import { DietMark } from '../common/DietMark.tsx';
import { DishImage } from '../common/DishImage.tsx';
import { Modal } from '../common/Modal.tsx';
import { QuantityStepper } from '../common/QuantityStepper.tsx';
import { DishLabels } from './DishCard.tsx';

/** Product detail view: large photo, description, price, availability, quantity and Add to cart. */
export function DishDetail({ item, restaurantId, onClose }: { item: MenuItem | null; restaurantId: string; onClose: () => void }) {
  const titleId = useId();
  return (
    <Modal open={item !== null} onClose={onClose} labelledBy={titleId} className="dish-modal">
      {item && <DishDetailBody key={item.id} item={item} restaurantId={restaurantId} titleId={titleId} onDone={onClose} />}
    </Modal>
  );
}

function DishDetailBody({ item, restaurantId, titleId, onDone }: { item: MenuItem; restaurantId: string; titleId: string; onDone: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  return (
    <div className="dish-detail">
      <div className="dish-detail-media">
        <DishImage name={item.name} imageKey={item.imageKey} category={item.category} decorative={false} />
      </div>
      <div className="dish-detail-body">
        <div className="eyebrow">{categoryName(item.category)}</div>
        <DishLabels item={item} />
        <h2 id={titleId} className="dish-detail-title"><DietMark diet={item.diet} size={18} /> {item.name}</h2>
        {item.diet && <div className="dish-detail-diet">{t(`diet.${item.diet}`)}</div>}
        {item.description && <p className="dish-detail-description">{item.description}</p>}
        <div className="dish-detail-price">{formatRupees(item.price)}</div>
        <div className={`availability ${item.available ? 'is-available' : 'is-unavailable'}`}>
          <span className="dot" />{item.available ? t('dish.available') : t('dish.unavailable')}
        </div>
        {item.available && (
          <div className="dish-detail-actions">
            <div>
              <div className="field-label">{t('dish.quantity')}</div>
              <QuantityStepper name={item.name} quantity={quantity} onChange={setQuantity} min={1} />
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => {
              if (addToCart(restaurantId, item, quantity)) {
                onDone();
              }
            }}>
              <ShoppingBag size={18} aria-hidden="true" />
              {t('dish.addToCart', { total: formatRupees(Math.round(item.price * 100) * quantity / 100) })}
            </button>
          </div>
        )}
        <p className="dish-detail-note"><Store size={15} aria-hidden="true" /> {t('dish.pickupNote')}</p>
      </div>
    </div>
  );
}

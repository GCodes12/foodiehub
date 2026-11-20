import { Trash2 } from 'lucide-react';
import type { CartLine } from '../../utils/cart.ts';
import { lineTotalPaise } from '../../utils/cart.ts';
import { t } from '../../utils/i18n.ts';
import { formatPaise } from '../../utils/money.ts';
import { DietMark } from '../common/DietMark.tsx';
import { DishImage } from '../common/DishImage.tsx';
import { QuantityStepper } from '../common/QuantityStepper.tsx';

interface Props {
  line: CartLine;
  unavailable?: boolean;
  repriced?: boolean;
  onQuantity?: (quantity: number) => void;
  onRemove?: () => void;
}

/** One cart line. Without handlers it is read-only (checkout review). */
export function CartLineItem({ line, unavailable = false, repriced = false, onQuantity, onRemove }: Props) {
  const editable = Boolean(onQuantity && onRemove);
  return (
    <li className={`cart-line${unavailable ? ' is-unavailable' : ''}`}>
      <DishImage name={line.name} imageKey={line.imageKey} category={line.category} className="cart-line-image" />
      <div className="cart-line-main">
        <div className="cart-line-name"><DietMark diet={line.diet} size={14} /> {line.name}</div>
        <div className="cart-line-each">{t('cart.each', { price: formatPaise(line.unitPricePaise) })}</div>
        {unavailable && <div className="cart-line-warning" role="status">{t('cart.unavailable')}</div>}
        {repriced && !unavailable && <div className="cart-line-note" role="status">{t('cart.repriced')}</div>}
      </div>
      <div className="cart-line-side">
        {editable && !unavailable ? (
          <QuantityStepper name={line.name} quantity={line.quantity} onChange={onQuantity!} size="sm" />
        ) : (
          <span className="cart-line-qty">× {line.quantity}</span>
        )}
        <span className="cart-line-total">{formatPaise(lineTotalPaise(line))}</span>
        {editable && (
          <button type="button" className="link-button" onClick={onRemove} aria-label={t('cart.removeAria', { name: line.name })}>
            <Trash2 size={14} aria-hidden="true" /> {t('cart.remove')}
          </button>
        )}
      </div>
    </li>
  );
}

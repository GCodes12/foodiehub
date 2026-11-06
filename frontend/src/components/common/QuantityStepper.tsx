import { Minus, Plus, Trash2 } from 'lucide-react';
import { MAX_QUANTITY } from '../../utils/cart.ts';
import { t } from '../../utils/i18n.ts';

interface Props {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  /** Minimum allowed; 0 shows a bin icon at 1 (removing the line), 1 stops at one (dish detail selector). */
  min?: 0 | 1;
  size?: 'sm' | 'md';
}

export function QuantityStepper({ name, quantity, onChange, min = 0, size = 'md' }: Props) {
  const iconSize = size === 'sm' ? 15 : 17;
  return (
    <div className={`stepper stepper-${size}`} role="group" aria-label={t('cart.quantityOf', { name })}>
      <button type="button" className="stepper-button" onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min} aria-label={t('cart.less', { name })}>
        {min === 0 && quantity === 1 ? <Trash2 size={iconSize} aria-hidden="true" /> : <Minus size={iconSize} aria-hidden="true" />}
      </button>
      <span className="stepper-value" aria-live="polite">{quantity}</span>
      <button type="button" className="stepper-button" onClick={() => onChange(quantity + 1)}
        disabled={quantity >= MAX_QUANTITY} aria-label={t('cart.more', { name })}>
        <Plus size={iconSize} aria-hidden="true" />
      </button>
    </div>
  );
}

import { useState } from 'react';
import { Award, ChefHat, Pencil, X } from 'lucide-react';
import type { MenuItem, MenuItemChanges } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { formatRupees } from '../../utils/money.ts';
import { hasErrors, MAX_DESCRIPTION, validateDishEdit } from '../../utils/ownerValidation.ts';
import type { DishEditErrors } from '../../utils/ownerValidation.ts';
import { DietMark } from '../common/DietMark.tsx';
import { DishImage } from '../common/DishImage.tsx';

interface Props {
  item: MenuItem;
  /** Resolves when the server accepted the change; rejects with the API error otherwise. */
  onSave: (changes: MenuItemChanges) => Promise<void>;
  busy?: boolean;
}

/** One dish in the owner's menu: an availability switch, and an editor for price, description and labels. */
export function DishEditor({ item, onSave, busy = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(item.price.toFixed(2));
  const [description, setDescription] = useState(item.description ?? '');
  const [bestseller, setBestseller] = useState(item.bestseller);
  const [chefSpecial, setChefSpecial] = useState(item.chefSpecial);
  const [errors, setErrors] = useState<DishEditErrors>({});

  function startEditing() {
    setPrice(item.price.toFixed(2));
    setDescription(item.description ?? '');
    setBestseller(item.bestseller);
    setChefSpecial(item.chefSpecial);
    setErrors({});
    setEditing(true);
  }

  async function save() {
    const found = validateDishEdit({ price, description });
    setErrors(found);
    if (hasErrors(found)) {
      return;
    }
    const changes: MenuItemChanges = {};
    if (Number(price) !== item.price) {
      changes.price = Number(price);
    }
    if (description.trim() !== (item.description ?? '')) {
      changes.description = description.trim();
    }
    if (bestseller !== item.bestseller) {
      changes.bestseller = bestseller;
    }
    if (chefSpecial !== item.chefSpecial) {
      changes.chefSpecial = chefSpecial;
    }
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    try {
      await onSave(changes);
      setEditing(false);
    } catch {
      // The page shows the error; keep the form open so nothing typed is lost.
    }
  }

  const switchId = `available-${item.id}`;
  return (
    <li className={`owner-dish${item.available ? '' : ' is-sold-out'}`}>
      <div className="owner-dish-row">
        <DishImage name={item.name} imageKey={item.imageKey} category={item.category} className="owner-dish-image" />
        <div className="owner-dish-main">
          <div className="owner-dish-name"><DietMark diet={item.diet} size={14} /> {item.name}</div>
          <div className="owner-dish-meta">
            <span className="price">{formatRupees(item.price)}</span>
            {item.bestseller && <span className="label label-bestseller"><Award size={12} aria-hidden="true" />{t('dish.bestseller')}</span>}
            {item.chefSpecial && <span className="label label-chef"><ChefHat size={12} aria-hidden="true" />{t('dish.chefSpecial')}</span>}
          </div>
        </div>
        <label className="switch" htmlFor={switchId}>
          <span className="switch-label">{item.available ? t('kitchen.available') : t('kitchen.soldOut')}</span>
          <button id={switchId} type="button" role="switch" aria-checked={item.available} className="switch-track"
            disabled={busy} onClick={() => void onSave({ available: !item.available }).catch(() => {})}
            aria-label={t('kitchen.availableAria', { name: item.name })}>
            <span className="switch-thumb" />
          </button>
        </label>
        <button type="button" className="icon-button owner-dish-edit" onClick={editing ? () => setEditing(false) : startEditing}
          aria-expanded={editing} aria-label={t(editing ? 'kitchen.closeEditor' : 'kitchen.edit', { name: item.name })}>
          {editing ? <X size={18} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
        </button>
      </div>

      {editing && (
        <form className="owner-dish-form" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
          <label className="field">
            <span className="field-label">{t('kitchen.price')}</span>
            <span className="input-prefix">
              <span aria-hidden="true">₹</span>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)}
                aria-invalid={errors.price ? true : undefined} aria-describedby={errors.price ? `${switchId}-price` : undefined} />
            </span>
            {errors.price && <span id={`${switchId}-price`} className="field-error">{t(errors.price)}</span>}
          </label>
          <label className="field field-wide">
            <span className="field-label">{t('kitchen.description')} <span className="muted">({description.length}/{MAX_DESCRIPTION})</span></span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              aria-invalid={errors.description ? true : undefined} />
            {errors.description && <span className="field-error">{t(errors.description, { max: MAX_DESCRIPTION })}</span>}
          </label>
          <div className="field-checks">
            <label className="check"><input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} />
              {t('dish.bestseller')}</label>
            <label className="check"><input type="checkbox" checked={chefSpecial} onChange={(e) => setChefSpecial(e.target.checked)} />
              {t('dish.chefSpecial')}</label>
          </div>
          <div className="owner-dish-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t('kitchen.cancel')}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}{t('kitchen.save')}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

// Client-side checks for an owner's dish edit, matching the Restaurant Service rules (DEC-012, DEC-015):
// price > 0, at most 99,999,999.99 and two decimals; description at most 300 characters. The server checks again.

export interface DishEdit {
  price: string;
  description: string;
}

export type DishEditErrors = Partial<Record<keyof DishEdit, string>>;

export const MAX_DESCRIPTION = 300;

/** Error message keys (src/messages/en.json) per field; empty when the edit is valid. */
export function validateDishEdit(edit: DishEdit): DishEditErrors {
  const errors: DishEditErrors = {};
  const price = edit.price.trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(price)) {
    errors.price = /^\d+\.\d{3,}$/.test(price) ? 'kitchen.errors.priceDecimals' : 'kitchen.errors.priceFormat';
  } else if (Number(price) <= 0) {
    errors.price = 'kitchen.errors.pricePositive';
  }
  if (edit.description.length > MAX_DESCRIPTION) {
    errors.description = 'kitchen.errors.descriptionLength';
  }
  return errors;
}

export function hasErrors(errors: DishEditErrors): boolean {
  return Object.keys(errors).length > 0;
}

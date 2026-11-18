import type { RestaurantForm, RestaurantFormErrors } from '../../utils/admin.ts';
import { RESTAURANT_LIMITS } from '../../utils/admin.ts';
import { t } from '../../utils/i18n.ts';

/** The restaurant details form fields (create and edit), with inline validation messages. */
export function RestaurantFormFields({ form, errors, onChange, idPrefix }: {
  form: RestaurantForm; errors: RestaurantFormErrors; onChange: (form: RestaurantForm) => void; idPrefix: string;
}) {
  const field = (name: keyof RestaurantForm, multiline = false) => {
    const id = `${idPrefix}-${name}`;
    const error = errors[name];
    const limit = name in RESTAURANT_LIMITS ? RESTAURANT_LIMITS[name as keyof typeof RESTAURANT_LIMITS] : undefined;
    const props = {
      id,
      value: form[name],
      onChange: (e: { target: { value: string } }) => onChange({ ...form, [name]: e.target.value }),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${id}-error` : undefined,
      required: name === 'name',
    };
    return (
      <label className={`field${multiline ? ' field-wide' : ''}`} htmlFor={id}>
        <span className="field-label">
          {t(`admin.form.${name}`)}{name === 'name' ? ' *' : ''}
          {limit && multiline && <span className="muted"> ({form[name].length}/{limit})</span>}
        </span>
        {multiline ? <textarea rows={3} {...props} /> : <span className="input-prefix input-plain"><input {...props} /></span>}
        {error && <span id={`${id}-error`} className="field-error">{t(error, { max: limit ?? '' })}</span>}
      </label>
    );
  };
  return (
    <div className="admin-form-grid">
      {field('name')}
      {field('city')}
      {field('address')}
      {field('phone')}
      {field('description', true)}
    </div>
  );
}

import en from '../messages/en.json' with { type: 'json' };

// All user-facing text lives in src/messages/en.json. Components ask for a key: t('cart.title').
// Placeholders: t('dish.added', { name }) fills "{name}". Plurals: with a numeric `count`, "<key>_one" or
// "<key>_other" is used when present. A missing key returns the key itself, so gaps are visible, never blank.
// Adding a language later = another JSON file with the same keys.

type Catalog = { [key: string]: string | Catalog };
type Vars = Record<string, string | number>;

const catalog: Catalog = en;

function lookup(key: string): string | undefined {
  let node: string | Catalog | undefined = catalog;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function hasMessage(key: string): boolean {
  return lookup(key) !== undefined;
}

export function t(key: string, vars: Vars = {}): string {
  const count = vars.count;
  const template =
    (typeof count === 'number' ? lookup(`${key}_${count === 1 ? 'one' : 'other'}`) : undefined) ?? lookup(key);
  if (template === undefined) {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

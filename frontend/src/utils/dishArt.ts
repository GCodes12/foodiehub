// What each dish's illustration shows (rendered by components/common/DishArt.tsx). Pure data: one entry per
// imageKey from the menu, plus a fallback per category. A photo in src/assets/dishes always takes precedence.

export type Vessel = 'handi' | 'bowl' | 'plate' | 'glass' | 'drink' | 'kulhad' | 'thali';
export type BowlStyle = 'ceramic' | 'brass' | 'clay' | 'kadai';
export type Topping = 'chicken' | 'chicken65' | 'tikka' | 'mutton' | 'egg' | 'paneer' | 'paneerMasala' | 'mushroom' | 'veg'
  | 'jamun' | 'rasmalai' | 'corn' | 'boondi' | 'cucumber' | 'chilli';
export type Garnish = 'mint' | 'onion' | 'coriander' | 'cream' | 'pistachio' | 'saffron' | 'lemon' | 'curryLeaf' | 'redChilli' | 'butter';
export type PlateItem = 'tikkaSkewers' | 'paneerSkewers' | 'seekh' | 'papad' | 'onionRings' | 'breadPudding';
export type DrinkKind = 'lassi' | 'mango' | 'chaas' | 'cola';

export interface ArtSpec {
  vessel: Vessel;
  /** Background hue (0–360). */
  hue: number;
  /** Colour of the food surface (rice, gravy, raita…). */
  content?: string;
  bowl?: BowlStyle;
  toppings?: Topping[];
  /** How many topping pieces to draw (default 5). */
  count?: number;
  garnish?: Garnish[];
  plate?: PlateItem;
  drink?: DrinkKind;
  /** Thali: colours of the small bowls; `mound` adds a biryani mound, `pieces` a starter. */
  katoris?: string[];
  mound?: boolean;
  pieces?: Topping;
  steam?: boolean;
}

const GRAVY = { makhani: '#d9622b', dal: '#5b2d1a', curry: '#9c3b17', masala: '#6e2a12', salan: '#7d6a2a' };
const RAITA = '#f6f1e4';

const BIRYANI = (toppings: Topping[], hue = 32, extra: Partial<ArtSpec> = {}): ArtSpec => ({
  vessel: 'handi', hue, toppings, steam: true, garnish: ['mint', 'onion'], ...extra,
});

export const DISH_ART: Record<string, ArtSpec> = {
  // Biryanis
  'classic-veg-dum-biryani': BIRYANI(['veg'], 90, { count: 7 }),
  'hyderabadi-veg-biryani': BIRYANI(['veg'], 80, { count: 6, garnish: ['mint', 'onion', 'saffron'] }),
  'mushroom-biryani': BIRYANI(['mushroom'], 60),
  'paneer-tikka-biryani': BIRYANI(['paneer'], 40),
  'paneer-butter-masala-biryani': BIRYANI(['paneerMasala'], 24),
  'classic-egg-biryani': BIRYANI(['egg'], 46, { count: 3 }),
  'double-egg-biryani': BIRYANI(['egg'], 50, { count: 5 }),
  'egg-masala-biryani': BIRYANI(['egg'], 30, { count: 3, content: '#e9963a' }),
  'classic-chicken-dum-biryani': BIRYANI(['chicken'], 28),
  'hyderabadi-chicken-biryani': BIRYANI(['chicken'], 20, { garnish: ['mint', 'onion', 'saffron'] }),
  'chicken-65-biryani': BIRYANI(['chicken65'], 8, { garnish: ['curryLeaf', 'onion'] }),
  'chicken-tikka-biryani': BIRYANI(['tikka'], 14),
  'boneless-chicken-biryani': BIRYANI(['chicken'], 34, { count: 6 }),
  'classic-mutton-dum-biryani': BIRYANI(['mutton'], 16),
  'hyderabadi-mutton-biryani': BIRYANI(['mutton'], 10, { garnish: ['mint', 'onion', 'saffron'] }),
  'special-mutton-biryani': BIRYANI(['mutton'], 350, { count: 6, garnish: ['mint', 'onion', 'saffron', 'lemon'] }),
  // Starters
  'chicken-65': { vessel: 'bowl', bowl: 'kadai', hue: 6, content: '#5a2416', toppings: ['chicken65'], count: 7, garnish: ['curryLeaf', 'redChilli'], steam: true },
  'chicken-tikka': { vessel: 'plate', hue: 14, plate: 'tikkaSkewers', garnish: ['onion', 'lemon'] },
  'paneer-tikka': { vessel: 'plate', hue: 40, plate: 'paneerSkewers', garnish: ['lemon'] },
  'seekh-kebab': { vessel: 'plate', hue: 22, plate: 'seekh', garnish: ['onion', 'lemon'] },
  'crispy-corn': { vessel: 'bowl', bowl: 'ceramic', hue: 48, content: '#e9b23c', toppings: ['corn'], count: 26, garnish: ['coriander', 'redChilli'] },
  // Curries
  'paneer-butter-masala': { vessel: 'bowl', bowl: 'brass', hue: 22, content: GRAVY.makhani, toppings: ['paneer'], count: 5, garnish: ['cream', 'coriander'], steam: true },
  'dal-makhani': { vessel: 'bowl', bowl: 'brass', hue: 26, content: GRAVY.dal, garnish: ['cream', 'butter', 'coriander'], steam: true },
  'chicken-curry': { vessel: 'bowl', bowl: 'clay', hue: 12, content: GRAVY.curry, toppings: ['chicken'], count: 4, garnish: ['coriander'], steam: true },
  'mutton-masala': { vessel: 'bowl', bowl: 'kadai', hue: 8, content: GRAVY.masala, toppings: ['mutton'], count: 4, garnish: ['coriander', 'onion'], steam: true },
  // Accompaniments
  'boondi-raita': { vessel: 'bowl', bowl: 'ceramic', hue: 40, content: RAITA, toppings: ['boondi'], count: 22, garnish: ['coriander'] },
  'cucumber-raita': { vessel: 'bowl', bowl: 'ceramic', hue: 100, content: RAITA, toppings: ['cucumber'], count: 7, garnish: ['mint'] },
  'mirchi-salan': { vessel: 'bowl', bowl: 'clay', hue: 70, content: GRAVY.salan, toppings: ['chilli'], count: 4, garnish: ['curryLeaf'] },
  papad: { vessel: 'plate', hue: 44, plate: 'papad' },
  'onion-salad': { vessel: 'plate', hue: 340, plate: 'onionRings', garnish: ['lemon'] },
  // Desserts
  'gulab-jamun': { vessel: 'bowl', bowl: 'ceramic', hue: 18, content: '#e3a04b', toppings: ['jamun'], count: 2, garnish: ['pistachio'] },
  rasmalai: { vessel: 'bowl', bowl: 'ceramic', hue: 44, content: '#f3dc9c', toppings: ['rasmalai'], count: 2, garnish: ['pistachio', 'saffron'] },
  'double-ka-meetha': { vessel: 'plate', hue: 34, plate: 'breadPudding', garnish: ['pistachio'] },
  phirni: { vessel: 'kulhad', hue: 30, content: '#f5ecd6', garnish: ['pistachio', 'saffron'] },
  // Beverages
  'sweet-lassi': { vessel: 'glass', hue: 38, drink: 'lassi', garnish: ['pistachio', 'saffron'] },
  'mango-lassi': { vessel: 'glass', hue: 42, drink: 'mango' },
  'masala-chaas': { vessel: 'glass', hue: 110, drink: 'chaas', garnish: ['mint'] },
  'soft-drink': { vessel: 'drink', hue: 200, drink: 'cola', garnish: ['lemon'] },
  // Combos
  'single-biryani-meal': { vessel: 'thali', hue: 28, mound: true, katoris: [RAITA, '#a8461c'] },
  'biryani-starter-combo': { vessel: 'thali', hue: 18, mound: true, pieces: 'chicken65', katoris: [RAITA] },
  'couple-combo': { vessel: 'thali', hue: 12, mound: true, pieces: 'paneer', katoris: [RAITA, '#a8461c', '#a8461c'] },
  'family-biryani-pack': { vessel: 'thali', hue: 4, mound: true, pieces: 'chicken65', katoris: [RAITA, GRAVY.salan, '#a8461c', '#a8461c'] },
};

const CATEGORY_ART: Record<string, ArtSpec> = {
  VEG_BIRYANI: DISH_ART['classic-veg-dum-biryani'],
  PANEER_BIRYANI: DISH_ART['paneer-tikka-biryani'],
  EGG_BIRYANI: DISH_ART['classic-egg-biryani'],
  CHICKEN_BIRYANI: DISH_ART['classic-chicken-dum-biryani'],
  MUTTON_BIRYANI: DISH_ART['hyderabadi-mutton-biryani'],
  STARTERS: DISH_ART['chicken-tikka'],
  CURRIES: DISH_ART['paneer-butter-masala'],
  ACCOMPANIMENTS: DISH_ART['boondi-raita'],
  DESSERTS: DISH_ART['gulab-jamun'],
  BEVERAGES: DISH_ART['mango-lassi'],
  COMBOS: DISH_ART['family-biryani-pack'],
};

const FALLBACK: ArtSpec = { vessel: 'bowl', bowl: 'ceramic', hue: 30, content: '#d98a3a', garnish: ['coriander'] };

export function artFor(imageKey: string | null, category: string): ArtSpec {
  return (imageKey ? DISH_ART[imageKey] : undefined) ?? CATEGORY_ART[category] ?? FALLBACK;
}

export function categoryArt(category: string): ArtSpec {
  return CATEGORY_ART[category] ?? FALLBACK;
}

/** Deterministic pseudo-random numbers, so a dish always looks the same. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

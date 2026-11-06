import { Cake, CookingPot, CupSoda, Drumstick, Egg, Flame, Leaf, Package, Salad, Soup, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  VEG_BIRYANI: Leaf,
  PANEER_BIRYANI: CookingPot,
  EGG_BIRYANI: Egg,
  CHICKEN_BIRYANI: Drumstick,
  MUTTON_BIRYANI: CookingPot,
  STARTERS: Flame,
  CURRIES: Soup,
  ACCOMPANIMENTS: Salad,
  DESSERTS: Cake,
  BEVERAGES: CupSoda,
  COMBOS: Package,
};

export function categoryIcon(code: string): LucideIcon {
  return ICONS[code] ?? UtensilsCrossed;
}

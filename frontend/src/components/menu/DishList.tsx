import { useNavigate } from 'react-router';
import { useCart } from '../../context/CartContext.tsx';
import { useAddToCart } from '../../hooks/useAddToCart.ts';
import type { MenuItem } from '../../types/api.ts';
import { quantityOf } from '../../utils/cart.ts';
import { paths } from '../../utils/paths.ts';
import { DishCard } from './DishCard.tsx';

/** Dish cards wired to the cart. `onOpen` opens the detail view (default: the menu page's dish view). */
export function DishList({ items, restaurantId, layout = 'grid', onOpen }: {
  items: MenuItem[]; restaurantId: string; layout?: 'grid' | 'rail'; onOpen?: (item: MenuItem) => void;
}) {
  const { cart, setQuantity } = useCart();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const open = onOpen ?? ((item: MenuItem) => navigate(paths.menu({ dish: item.id })));
  return (
    <ul className={layout === 'rail' ? 'dish-rail' : 'dish-grid'}>
      {items.map((item) => (
        <li key={item.id}>
          <DishCard item={item} variant={layout} quantity={quantityOf(cart, restaurantId, item.id)}
            onAdd={() => addToCart(restaurantId, item)} onQuantity={(q) => setQuantity(item.id, q)} onOpen={() => open(item)} />
        </li>
      ))}
    </ul>
  );
}

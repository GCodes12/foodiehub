import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ToastProvider } from './components/common/Toast.tsx';
import { Layout } from './components/layout/Layout.tsx';
import { RequireAuth } from './components/layout/RequireAuth.tsx';
import { RequireRole } from './components/layout/RequireRole.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { KitchenPage } from './pages/KitchenPage.tsx';
import { MenuPage } from './pages/MenuPage.tsx';
import { MyOrdersPage } from './pages/MyOrdersPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { OrderPage } from './pages/OrderPage.tsx';
import { OurStoryPage } from './pages/OurStoryPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.tsx';
import { AdminNewOwnerPage, AdminOwnersPage } from './pages/admin/AdminOwnersPage.tsx';
import { AdminNewRestaurantPage, AdminRestaurantPage } from './pages/admin/AdminRestaurantPage.tsx';
import { AdminRestaurantsPage } from './pages/admin/AdminRestaurantsPage.tsx';
import { t } from './utils/i18n.ts';

/**
 * Routes. Browsing is public; checkout needs the CUSTOMER role, orders a login, the kitchen RESTAURANT_OWNER (DEC-015),
 * and /admin the ADMIN role (DEC-017). These checks only decide what to show: every API enforces the same roles.
 */
export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="our-story" element={<OurStoryPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={
                  <RequireRole role="CUSTOMER" title={t('auth.customerOnlyTitle')} text={t('auth.customerOnlyText')}>
                    <CheckoutPage />
                  </RequireRole>} />
                <Route path="orders" element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
                <Route path="orders/:orderId" element={<RequireAuth><OrderPage /></RequireAuth>} />
                <Route path="kitchen" element={
                  <RequireRole role="RESTAURANT_OWNER" title={t('auth.ownerOnlyTitle')} text={t('auth.ownerOnlyText')}>
                    <KitchenPage />
                  </RequireRole>} />
                <Route path="admin" element={<AdminOnly><AdminDashboardPage /></AdminOnly>} />
                <Route path="admin/restaurants" element={<AdminOnly><AdminRestaurantsPage /></AdminOnly>} />
                <Route path="admin/restaurants/new" element={<AdminOnly><AdminNewRestaurantPage /></AdminOnly>} />
                <Route path="admin/restaurants/:restaurantId" element={<AdminOnly><AdminRestaurantPage /></AdminOnly>} />
                <Route path="admin/orders" element={<AdminOnly><AdminOrdersPage /></AdminOnly>} />
                <Route path="admin/owners" element={<AdminOnly><AdminOwnersPage /></AdminOnly>} />
                <Route path="admin/owners/new" element={<AdminOnly><AdminNewOwnerPage /></AdminOnly>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

/** Every administrator page: login first, then the ADMIN role (DEC-017). */
export function AdminOnly({ children }: { children: ReactNode }) {
  return <RequireRole role="ADMIN" title={t('auth.adminOnlyTitle')} text={t('auth.adminOnlyText')}>{children}</RequireRole>;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev proxy plays the gateway's role for VS-1: the browser talks to one origin (localhost:5173) and the
// paths match the planned gateway routes, so no CORS setup is needed and the app code will not change later.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Keycloak only accepts redirects to http://localhost:5173 (foodiehub-realm.json)
    proxy: {
      '/api/v1/restaurants': process.env.RESTAURANT_SERVICE_URL ?? 'http://localhost:8081',
      '/api/v1/orders': process.env.ORDER_SERVICE_URL ?? 'http://localhost:8082',
      // Owner endpoints (DEC-015)
      '/api/v1/owner/restaurants': process.env.RESTAURANT_SERVICE_URL ?? 'http://localhost:8081',
      '/api/v1/owner/orders': process.env.ORDER_SERVICE_URL ?? 'http://localhost:8082',
      // Administrator endpoints (DEC-017). The first matching prefix wins, so the order-service one comes first.
      '/api/v1/admin/orders': process.env.ORDER_SERVICE_URL ?? 'http://localhost:8082',
      '/api/v1/admin': process.env.RESTAURANT_SERVICE_URL ?? 'http://localhost:8081',
    },
  },
});

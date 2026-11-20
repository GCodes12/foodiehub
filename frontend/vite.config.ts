import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser talks to one origin (localhost:5173); the dev server forwards /api to the API gateway, so no CORS setup is
// needed and the app code is the same with or without the gateway.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Keycloak only accepts redirects to http://localhost:5173 (foodiehub-realm.json)
    proxy: {
      // DEC-019: every API call goes to the API gateway (the only public entry, plan.md D2), which finds the services
      // in Consul and balances between their instances. Override with GATEWAY_URL.
      '/api': process.env.GATEWAY_URL ?? 'http://localhost:8090',
    },
  },
});

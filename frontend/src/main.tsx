import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/plus-jakarta-sans';
import { App } from './App.tsx';
import { initAuth } from './services/auth.ts';
import './styles/index.css';

// Keycloak is initialised before the first render so pages know whether the user is signed in. If Keycloak is slow
// or never answers (blocked silent check, offline), the app still appears after 4 s; the sign-in state then updates
// as soon as Keycloak responds (AuthProvider subscribes to it).
const authReady = initAuth();
const fallback = new Promise<void>((resolve) => setTimeout(resolve, 4000));

void Promise.race([authReady, fallback]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

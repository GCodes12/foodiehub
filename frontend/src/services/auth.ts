import type Keycloak from 'keycloak-js';

// Sign-in with Keycloak (Authorization Code + PKCE, public client). No secret lives in the browser; tokens stay in
// memory only and are refreshed before they expire. keycloak-js is loaded lazily so that modules importing this
// file can also be loaded outside a browser (tests).
// Configuration (all optional, see .env.example): VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID.

export interface AuthSnapshot {
  /** false when Keycloak could not be reached: browsing still works, signing in does not. */
  available: boolean;
  signedIn: boolean;
  username: string | null;
  displayName: string | null;
  /** true after a session ended on its own (refresh failed, or the API answered 401). */
  sessionExpired: boolean;
  /** Keycloak realm roles of the signed-in user (DEC-015): CUSTOMER, RESTAURANT_OWNER. */
  roles: string[];
}

export type Role = 'CUSTOMER' | 'RESTAURANT_OWNER';

let keycloak: Keycloak | null = null;
let snapshot: AuthSnapshot = { available: false, signedIn: false, username: null, displayName: null, sessionExpired: false, roles: [] };
const listeners = new Set<(s: AuthSnapshot) => void>();

function publish(next: Partial<AuthSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
}

/** Realm roles from an access-token payload (claim realm_access.roles). */
export function rolesFromClaims(claims: Record<string, unknown> | undefined): string[] {
  const access = claims?.realm_access as { roles?: unknown } | undefined;
  return Array.isArray(access?.roles) ? access.roles.filter((r): r is string => typeof r === 'string') : [];
}

function fromToken(): Pick<AuthSnapshot, 'signedIn' | 'username' | 'displayName' | 'roles'> {
  const claims = keycloak?.tokenParsed as Record<string, unknown> | undefined;
  const signedIn = keycloak?.authenticated === true;
  const username = typeof claims?.preferred_username === 'string' ? claims.preferred_username : null;
  const name = typeof claims?.given_name === 'string' ? claims.given_name : typeof claims?.name === 'string' ? claims.name : null;
  return {
    signedIn,
    username: signedIn ? username : null,
    displayName: signedIn ? name ?? username : null,
    roles: signedIn ? rolesFromClaims(claims) : [],
  };
}

/** Restores an existing Keycloak session silently, if there is one. Never throws. */
export async function initAuth(): Promise<void> {
  try {
    const { default: KeycloakClass } = await import('keycloak-js');
    keycloak = new KeycloakClass({
      url: import.meta.env?.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
      realm: import.meta.env?.VITE_KEYCLOAK_REALM ?? 'foodiehub',
      clientId: import.meta.env?.VITE_KEYCLOAK_CLIENT_ID ?? 'foodiehub-frontend',
    });
    keycloak.onTokenExpired = () => {
      keycloak?.updateToken(30).catch(() => markSessionExpired());
    };
    keycloak.onAuthLogout = () => markSessionExpired();
    await keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      messageReceiveTimeout: 5000,
    });
    publish({ available: true, ...fromToken() });
  } catch (error) {
    keycloak = null;
    publish({ available: false, signedIn: false, username: null, displayName: null, roles: [] });
    console.warn('Sign-in is unavailable: Keycloak could not be reached.', error);
  }
}

export function markSessionExpired(): void {
  if (snapshot.signedIn) {
    publish({ signedIn: false, username: null, displayName: null, roles: [], sessionExpired: true });
  }
}

export const authService = {
  current: (): AuthSnapshot => snapshot,

  subscribe(listener: (s: AuthSnapshot) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Sends the user to the Keycloak sign-in page and back to `returnTo` (default: the current page). */
  async login(returnTo?: string): Promise<void> {
    await keycloak?.login({ redirectUri: new URL(returnTo ?? window.location.href, window.location.origin).href });
  },

  async logout(): Promise<void> {
    await keycloak?.logout({ redirectUri: `${window.location.origin}/` });
  },

  /** A token valid for at least 30 more seconds, or null if the user is not (or no longer) signed in. */
  async getToken(): Promise<string | null> {
    if (!keycloak?.authenticated) {
      return null;
    }
    try {
      await keycloak.updateToken(30);
    } catch {
      markSessionExpired();
      return null;
    }
    return keycloak.token ?? null;
  },
};

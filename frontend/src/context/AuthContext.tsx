import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.ts';
import type { AuthSnapshot, Role } from '../services/auth.ts';

export interface AuthContextValue extends AuthSnapshot {
  login: (returnTo?: string) => void;
  logout: () => void;
}

export function hasRole(auth: Pick<AuthSnapshot, 'signedIn' | 'roles'>, role: Role): boolean {
  return auth.signedIn && auth.roles.includes(role);
}

const signedOut: AuthContextValue = {
  available: false,
  signedIn: false,
  username: null,
  displayName: null,
  sessionExpired: false,
  roles: [],
  login: () => {},
  logout: () => {},
};

/** Exported so tests can provide a fixed sign-in state. */
export const AuthContext = createContext<AuthContextValue>(signedOut);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** Publishes the Keycloak session (signed in, user name, expiry) to the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(() => authService.current());

  useEffect(() => authService.subscribe(setSnapshot), []);

  const value: AuthContextValue = {
    ...snapshot,
    login: (returnTo) => void authService.login(returnTo),
    logout: () => void authService.logout(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldAlert } from 'lucide-react';
import { hasRole, useAuth } from '../../context/AuthContext.tsx';
import type { Role } from '../../services/auth.ts';
import { t } from '../../utils/i18n.ts';
import { EmptyState } from '../common/EmptyState.tsx';
import { RequireAuth } from './RequireAuth.tsx';

/**
 * Protected route for one role (DEC-015): first login (RequireAuth), then the role. A signed-in user without the
 * role gets an explanation instead of the page. The server enforces the same rule (403); this only explains it.
 */
export function RequireRole({ role, title, text, icon = ShieldAlert, children }: {
  role: Role; title: string; text: string; icon?: LucideIcon; children: ReactNode;
}) {
  const auth = useAuth();
  return (
    <RequireAuth>
      {hasRole(auth, role) ? children : (
        <EmptyState icon={icon} title={title} text={text}>
          <button type="button" className="btn btn-secondary" onClick={auth.logout}>{t('auth.switchAccount')}</button>
        </EmptyState>
      )}
    </RequireAuth>
  );
}

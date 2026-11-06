import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { CloudOff, LockKeyhole, TimerOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { t } from '../../utils/i18n.ts';
import { EmptyState } from '../common/EmptyState.tsx';

/**
 * Protected route: shows its children only to a signed-in user. Otherwise a login prompt that returns to this page
 * after signing in (no automatic redirect, so a failed sign-in can never loop).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.signedIn) {
    return <>{children}</>;
  }
  if (!auth.available) {
    return <EmptyState icon={CloudOff} title={t('auth.unavailableTitle')} text={t('auth.unavailableText')} />;
  }
  const expired = auth.sessionExpired;
  return (
    <EmptyState icon={expired ? TimerOff : LockKeyhole} title={t(expired ? 'auth.expiredTitle' : 'auth.requiredTitle')}
      text={t(expired ? 'auth.expiredText' : 'auth.requiredText')}>
      <button type="button" className="btn btn-primary btn-lg" onClick={() => auth.login(location.pathname + location.search)}>
        {t('auth.login')}
      </button>
    </EmptyState>
  );
}

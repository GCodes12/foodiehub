import { CircleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ApiError, describeError } from '../../services/api.ts';
import { t } from '../../utils/i18n.ts';

/** An error panel: the text comes from the messages file; field details come from the server's resources. */
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const auth = useAuth();
  const needsSignIn = error instanceof ApiError && error.status === 401;
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : [];
  return (
    <div className="alert" role="alert">
      <CircleAlert className="alert-icon" size={20} aria-hidden="true" />
      <div className="alert-body">
        <p>{describeError(error)}</p>
        {fieldErrors.length > 0 && (
          <ul>
            {fieldErrors.map((e) => (
              <li key={`${e.field}:${e.message}`}><code>{e.field}</code> {e.message}</li>
            ))}
          </ul>
        )}
        {(needsSignIn || onRetry) && (
          <div className="alert-actions">
            {needsSignIn && auth.available && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => auth.login()}>{t('auth.login')}</button>
            )}
            {onRetry && !needsSignIn && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>{t('common.retry')}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

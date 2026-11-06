import { hasMessage, t } from '../../utils/i18n.ts';

/** An order status with a colour per stage (DEC-016). Unknown statuses are shown as returned. */
export function StatusBadge({ status }: { status: string }) {
  const label = hasMessage(`order.statuses.${status}`) ? t(`order.statuses.${status}`) : status;
  return <span className={`badge status-badge status-${status.toLowerCase().replace(/_/g, '-')}`}>{label}</span>;
}

import { Check, ChefHat, CircleCheck, Clock, PackageCheck, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Order } from '../../types/api.ts';
import { t } from '../../utils/i18n.ts';
import { trackerSteps } from '../../utils/orderStatus.ts';

const ICONS: Record<string, LucideIcon> = {
  PENDING_PAYMENT: Clock,
  ACCEPTED: CircleCheck,
  PREPARING: ChefHat,
  READY_FOR_PICKUP: ShoppingBag,
  PICKED_UP: PackageCheck,
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Customer progress: Placed → Accepted → Preparing → Ready for pickup → Picked up, with the time of each step. */
export function OrderTracker({ order }: { order: Pick<Order, 'status' | 'createdAt' | 'history'> }) {
  return (
    <ol className="tracker" aria-label={t('order.trackerLabel')}>
      {trackerSteps(order).map((step) => {
        const Icon = step.state === 'done' ? Check : ICONS[step.status];
        return (
          <li key={step.status} className={`tracker-step is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
            <span className="tracker-icon"><Icon size={16} aria-hidden="true" /></span>
            <span className="tracker-text">
              <span className="tracker-title">{t(`order.tracker.${step.status}`)}</span>
              {step.at && step.state !== 'next' && <span className="tracker-time">{time(step.at)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

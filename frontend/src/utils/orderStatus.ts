import type { Order, OrderStatus, RejectReason } from '../types/api.ts';

// The pickup order lifecycle as the UI shows it (DEC-016). The server is the authority on allowed moves; this only
// decides which buttons and steps to show.
//   PENDING_PAYMENT ─► ACCEPTED ─► PREPARING ─► READY_FOR_PICKUP ─► PICKED_UP      (or PENDING_PAYMENT ─► REJECTED)

export const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'];
export const REJECT_REASONS: RejectReason[] = ['SOLD_OUT', 'TOO_BUSY', 'CLOSING'];

export function isFinal(status: string): boolean {
  return status === 'REJECTED' || status === 'PICKED_UP';
}

export function isActive(status: string): boolean {
  return !isFinal(status);
}

/** The single "move forward" step an owner can take; null when the order is new (accept/reject) or final. */
export function nextStep(status: string): OrderStatus | null {
  switch (status) {
    case 'ACCEPTED':
      return 'PREPARING';
    case 'PREPARING':
      return 'READY_FOR_PICKUP';
    case 'READY_FOR_PICKUP':
      return 'PICKED_UP';
    default:
      return null;
  }
}

export function awaitsDecision(status: string): boolean {
  return status === 'PENDING_PAYMENT';
}

export type StepState = 'done' | 'current' | 'next';

export interface TrackerStep {
  status: OrderStatus;
  state: StepState;
  /** When the order reached this step (from the history; the placed step uses createdAt). */
  at: string | null;
}

/** Customer progress tracker. A rejected order has no tracker (see isRejected). */
export function trackerSteps(order: Pick<Order, 'status' | 'createdAt' | 'history'>): TrackerStep[] {
  const reached = FLOW.indexOf(order.status as OrderStatus);
  const times = new Map((order.history ?? []).map((h) => [h.status, h.at] as const));
  return FLOW.map((status, i) => ({
    status,
    state: i < reached || (i === reached && status === 'PICKED_UP') ? 'done' : i === reached ? 'current' : 'next',
    at: status === 'PENDING_PAYMENT' ? order.createdAt : times.get(status) ?? null,
  }));
}

/** Kitchen tabs: open orders first, finished ones in History. Both keep the server's newest-first order. */
export function splitOrders(orders: Order[]): { active: Order[]; history: Order[] } {
  return { active: orders.filter((o) => isActive(o.status)), history: orders.filter((o) => isFinal(o.status)) };
}

// Money is handled in whole paise inside the app, so adding prices never produces floating-point errors
// (0.1 + 0.2). The server is the authority on prices and totals; these values are only for display.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** Converts a rupee amount from the API (for example 129.5) to whole paise (12950). */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

export function formatRupees(rupees: number): string {
  return inr.format(rupees);
}

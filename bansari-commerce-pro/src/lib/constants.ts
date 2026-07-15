/** Shared production constants — single source of truth. */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in';

export const SITE_NAME = 'Bansari Collections';

export const LOW_STOCK_THRESHOLD = 5;

export const ORDER_STATUSES = [
  'placed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CURRENCY = 'INR';

export const MAX_RATE_LIMIT_CHECKOUT = 20;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

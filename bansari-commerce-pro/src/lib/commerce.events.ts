/**
 * Commerce Domain Events.
 *
 * RULES:
 *  1. All event types are Readonly<> — mutation after creation is a type error.
 *  2. DomainEventBus is synchronous and in-memory only.
 *     No middleware, no persistence, no retries, no async queuing.
 *  3. Events are observability / side-effect hooks.
 *     Order integrity is guaranteed by DB transactions, NOT event delivery.
 *  4. The bus is swappable: replace the default export with a Redis Streams
 *     or Supabase Realtime adapter without changing emitter code.
 *
 * @module commerce.events
 */

// ---------------------------------------------------------------------------
// Base envelope
// ---------------------------------------------------------------------------

export type DomainEvent<TType extends string, TPayload> = Readonly<{
  type:          TType;
  occurredAt:    string;   // ISO 8601 — from Clock.now().toISOString()
  correlationId: string;   // traces a single checkout flow end-to-end
  checkoutId:    string;   // the checkout session identifier
  payload:       Readonly<TPayload>;
}>;

// ---------------------------------------------------------------------------
// Concrete event types (all 9 approved events)
// ---------------------------------------------------------------------------

export type CheckoutPreparedEvent = DomainEvent<
  'checkout.prepared',
  { sessionId: string; itemCount: number; subtotalInPaise: number }
>;

export type InventoryReservedEvent = DomainEvent<
  'inventory.reserved',
  { reservationId: string; reservationToken: string; itemCount: number; expiresAt: string }
>;

export type PaymentInitiatedEvent = DomainEvent<
  'payment.initiated',
  { razorpayOrderId: string; amountInPaise: number }
>;

export type PaymentCapturedEvent = DomainEvent<
  'payment.captured',
  { razorpayOrderId: string; razorpayPaymentId: string }
>;

export type CouponConsumedEvent = DomainEvent<
  'coupon.consumed',
  // NOTE: couponCode is intentionally EXCLUDED — never log or emit the raw code.
  { couponId: string; discountInPaise: number }
>;

export type InventoryConfirmedEvent = DomainEvent<
  'inventory.confirmed',
  { reservationToken: string; orderId: string }
>;

export type OrderCreatedEvent = DomainEvent<
  'order.created',
  { orderId: string; grandTotalInPaise: number }
>;

export type CheckoutRecoveredEvent = DomainEvent<
  'checkout.recovered',
  { razorpayOrderId: string; recoveryPath: 'webhook' | 'manual' }
>;

export type CheckoutFailedEvent = DomainEvent<
  'checkout.failed',
  { reason: string; errorCode: string; compensationsRun: readonly string[] }
>;

/** Union of all commerce domain events. */
export type CommerceDomainEvent =
  | CheckoutPreparedEvent
  | InventoryReservedEvent
  | PaymentInitiatedEvent
  | PaymentCapturedEvent
  | CouponConsumedEvent
  | InventoryConfirmedEvent
  | OrderCreatedEvent
  | CheckoutRecoveredEvent
  | CheckoutFailedEvent;

// ---------------------------------------------------------------------------
// DomainEventBus — minimal in-memory, synchronous, no dependencies
// ---------------------------------------------------------------------------

export type EventHandler<T extends CommerceDomainEvent> = (event: T) => void;
export type Unsubscribe = () => void;

export interface IDomainEventBus {
  emit(event: CommerceDomainEvent): void;
  subscribe<T extends CommerceDomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): Unsubscribe;
}

class InMemoryDomainEventBus implements IDomainEventBus {
  private readonly _handlers = new Map<string, Set<EventHandler<CommerceDomainEvent>>>();

  emit(event: CommerceDomainEvent): void {
    const handlers = this._handlers.get(event.type);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // Handlers must not crash the emitter.
        // Errors inside handlers are the handler's responsibility to log.
      }
    }
  }

  subscribe<T extends CommerceDomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): Unsubscribe {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set());
    }
    const handlers = this._handlers.get(type)!;
    handlers.add(handler as EventHandler<CommerceDomainEvent>);

    return () => {
      handlers.delete(handler as EventHandler<CommerceDomainEvent>);
    };
  }
}

/**
 * Default event bus instance.
 * In tests, create a new InMemoryDomainEventBus() per test suite to isolate state.
 * Exported class for test instantiation.
 */
export { InMemoryDomainEventBus };
export const domainEventBus: IDomainEventBus = new InMemoryDomainEventBus();

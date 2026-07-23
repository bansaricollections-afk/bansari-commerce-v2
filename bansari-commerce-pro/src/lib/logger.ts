/**
 * Structured JSON logger for Bansari Commerce.
 *
 * Every log entry is a single JSON line on stdout so log aggregators
 * (Vercel, Datadog, etc.) can index fields individually.
 *
 * Usage:
 *   const log = createLogger({ requestId, service: 'create-order' });
 *   log.info('order.created', { orderId, razorpayOrderId, grandTotal });
 *   log.error('payment.failed', err, { paymentId });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  orderId?: string;
  razorpayOrderId?: string;
  paymentId?: string;
  customerId?: string;
  route?: string;
  latencyMs?: number;
  environment?: string;
  gitSha?: string;
  [key: string]: unknown;
};

export type LogEntry = LogContext & {
  level: LogLevel;
  service: string;
  event: string;
  timestamp: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  stack?: string;
};

function writeEntry(entry: LogEntry): void {
  try {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } catch {
     
    console.error('[logger] Failed to write structured log entry', entry);
  }
}

function extractErrorFields(
  error: unknown
): Pick<LogEntry, 'errorCode' | 'errorMessage' | 'stack'> {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorCode: (error as Error & { code?: string }).code,
      stack:
        process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    };
  }
  if (typeof error === 'string') {
    return { errorMessage: error };
  }
  return {};
}

/** Shared runtime context injected into every log entry automatically. */
const RUNTIME_CTX: Partial<LogContext> = {
  environment: process.env.NODE_ENV ?? 'development',
  gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local',
};

export type Logger = {
  debug(event: string, ctx?: LogContext): void;
  info(event: string, ctx?: LogContext): void;
  warn(event: string, ctx?: LogContext): void;
  error(event: string, error?: unknown, ctx?: LogContext): void;
  child(ctx: LogContext): Logger;
  /** Returns a timing fn: call it to log with durationMs populated. */
  startTimer(
    event: string,
    ctx?: LogContext
  ): (level?: LogLevel, extraCtx?: LogContext) => void;
};

export function createLogger(
  baseCtx: LogContext & { service: string }
): Logger {
  function log(
    level: LogLevel,
    event: string,
    ctx?: LogContext,
    error?: unknown
  ): void {
    const entry: LogEntry = {
      ...RUNTIME_CTX,
      ...baseCtx,
      ...ctx,
      ...extractErrorFields(error),
      level,
      service: baseCtx.service,
      event,
      timestamp: new Date().toISOString(),
    };
    writeEntry(entry);
  }

  const logger: Logger = {
    debug: (event, ctx) => log('debug', event, ctx),
    info: (event, ctx) => log('info', event, ctx),
    warn: (event, ctx) => log('warn', event, ctx),
    error: (event, error?, ctx?) => log('error', event, ctx, error),

    child(ctx: LogContext): Logger {
      return createLogger({ ...baseCtx, ...ctx });
    },

    startTimer(event, ctx) {
      const start = Date.now();
      return (level: LogLevel = 'info', extraCtx?: LogContext) => {
        log(level, event, { ...ctx, ...extraCtx, durationMs: Date.now() - start });
      };
    },
  };

  return logger;
}

/** Module-level logger for one-off uses. */
export const logger = createLogger({ service: 'bansari-commerce' });

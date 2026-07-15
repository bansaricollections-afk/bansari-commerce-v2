import { NextResponse } from 'next/server';

type CheckResult = {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  message?: string;
};

type HealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  checks: {
    database: CheckResult;
    payments: CheckResult;
    email: CheckResult;
  };
};

async function fetchCheck(url: string, base: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${base}${url}`, { cache: 'no-store' });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { status: 'error', latencyMs, message: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as CheckResult;
    return { ...data, latencyMs };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const base = new URL(request.url).origin;

  const [database, payments, email] = await Promise.all([
    fetchCheck('/api/health/database', base),
    fetchCheck('/api/health/payments', base),
    fetchCheck('/api/health/email', base),
  ]);

  const checks = { database, payments, email };

  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');
  const overallStatus = hasError ? 'error' : hasDegraded ? 'degraded' : 'ok';

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  };

  const httpStatus = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(body, { status: httpStatus });
}

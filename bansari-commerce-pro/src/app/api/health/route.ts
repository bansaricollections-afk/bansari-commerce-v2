import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/env';
import { generateRequestId } from '@/lib/request-id';

const SERVER_START = Date.now();

type CheckResult = {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  message?: string;
};

type HealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  requestId: string;
  timestamp: string;
  version: string;
  gitCommit: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memoryMb: { rss: number; heapUsed: number; heapTotal: number };
  checks: {
    database: CheckResult;
    payments: CheckResult;
    email: CheckResult;
    environment: CheckResult;
  };
};

function checkEnvironment(): CheckResult {
  try {
    validateEnv();
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Environment validation failed.',
    };
  }
}

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
  const requestId = generateRequestId();
  const base = new URL(request.url).origin;

  const [database, payments, email] = await Promise.all([
    fetchCheck('/api/health/database', base),
    fetchCheck('/api/health/payments', base),
    fetchCheck('/api/health/email', base),
  ]);

  const environment = checkEnvironment();
  const checks = { database, payments, email, environment };

  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');
  const overallStatus = hasError ? 'error' : hasDegraded ? 'degraded' : 'ok';

  const mem = process.memoryUsage();
  const toMb = (n: number) => Math.round(n / 1024 / 1024);

  const body: HealthResponse = {
    status: overallStatus,
    requestId,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor((Date.now() - SERVER_START) / 1_000),
    memoryMb: {
      rss: toMb(mem.rss),
      heapUsed: toMb(mem.heapUsed),
      heapTotal: toMb(mem.heapTotal),
    },
    checks,
  };

  const httpStatus = overallStatus === 'error' ? 503 : 200;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: { 'Cache-Control': 'no-store, no-cache' },
  });
}

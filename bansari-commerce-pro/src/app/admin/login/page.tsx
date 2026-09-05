'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInAdmin } from '@/services/auth.service';
import { getMfaStatus, verifyMfaCode } from '@/services/mfa.service';

export default function AdminLoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(() => {
    const e = searchParams.get('error');
    if (e === 'not_admin') return 'Your account does not have administrator access.';
    if (e === 'mfa_required') return 'Two-factor authentication is required to continue.';
    return '';
  });

  /*
   * Second step of the login, shown only when the account has a verified
   * factor. `factorId` doubles as the flag for "password accepted, code
   * outstanding" — there is no separate boolean to fall out of sync with it.
   */
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code,     setCode]     = useState('');

  /** Where to land once the session is fully authenticated. */
  function destination(): string {
    const next = searchParams.get('next');
    return next && next.startsWith('/admin') && !next.startsWith('/admin/login')
      ? next
      : '/admin';
  }

  async function handleLogin() {
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      await signInAdmin(email, password);

      /*
       * The password alone produces an AAL1 session. If the account has a
       * factor enrolled, that session cannot do anything — requireAdminSession
       * rejects it — so ask for the code before navigating anywhere.
       */
      const status = await getMfaStatus();
      if (status.enrolled && !status.satisfied && status.factorId) {
        setFactorId(status.factorId);
        return;
      }

      router.push(destination());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError('');

    if (!factorId) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    try {
      setLoading(true);
      await verifyMfaCode(factorId, code);
      router.push(destination());
      router.refresh();
    } catch (err) {
      // Deliberately generic: never reveal whether the code was merely stale
      // versus wrong, and never hint at the factor's existence beyond this point.
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (factorId) handleVerify();
      else handleLogin();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F8F8] px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-sm">
        <h1 className="mb-8 text-center font-[family:var(--font-playfair)] text-4xl font-bold">
          Admin Login
        </h1>

        {/*
          Two steps in one screen. The email and password inputs are unmounted
          once a factor challenge is outstanding, so the password cannot sit in
          the DOM while the second factor is being entered.
        */}
        {!factorId ? (
          <div className="space-y-5">
            <input
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
            />

            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
            />

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-center text-sm text-slate-600">
              Enter the 6-digit code from your authenticator app.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              // Digits only: an authenticator code is never anything else, and
              // stripping here keeps the 6-digit guard below meaningful.
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border p-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#8A5A6A]"
            />

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { setFactorId(null); setCode(''); setError(''); }}
              className="w-full text-center text-sm text-slate-500 underline"
            >
              Use a different account
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

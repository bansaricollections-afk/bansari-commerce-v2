'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  confirmEnrollment,
  getMfaStatus,
  removeFactor,
  startEnrollment,
} from '@/services/mfa.service';

/**
 * Admin security settings — enrol or remove two-factor authentication.
 *
 * The admin panel is protected by an email and password held in Supabase Auth.
 * Two-factor on the Supabase or Vercel dashboards does not apply to it: those
 * are separate accounts. This page is where a second factor is actually added
 * to the login that guards orders, pricing and customer data.
 *
 * Enrolment is deliberately two-stage — scan, then prove a code works — so an
 * account can never end up demanding a factor the user has not successfully
 * stored. Enforcement lives server-side in requireAdminSession(); this page
 * only sets the factor up.
 */
export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  // Enrolment in progress
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');

  const refresh = useCallback(async () => {
    try {
      const status = await getMfaStatus();
      setEnrolled(status.enrolled);
      setFactorId(status.factorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read security status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleStart() {
    setError(''); setNotice('');
    try {
      setBusy(true);
      const { factorId: id, qrSvg: qr, secret: s } = await startEnrollment();
      setPendingFactorId(id);
      setQrSvg(qr);
      setSecret(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start enrolment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setError('');
    if (!pendingFactorId) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      setBusy(true);
      await confirmEnrollment(pendingFactorId, code);
      setPendingFactorId(null);
      setQrSvg(''); setSecret(''); setCode('');
      setNotice('Two-factor authentication is now active on this account.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(''); setNotice('');
    if (!factorId) return;
    if (!confirm('Remove two-factor authentication? Your admin account will be protected by password alone.')) return;
    try {
      setBusy(true);
      await removeFactor(factorId);
      setNotice('Two-factor authentication removed.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the factor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 font-[family:var(--font-playfair)] text-3xl">Security</h1>
      <p className="mb-8 text-sm text-slate-600">
        Two-factor authentication for the admin panel.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Checking…</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="mb-4 text-sm text-green-700">{notice}</p>}

          {/* ── Already protected ─────────────────────────────────────────── */}
          {enrolled && !pendingFactorId && (
            <>
              <p className="mb-2 font-medium text-green-700">
                Two-factor authentication is active.
              </p>
              <p className="mb-6 text-sm text-slate-600">
                A code from your authenticator app is required at every sign-in.
              </p>
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="rounded-xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                {busy ? 'Removing…' : 'Remove two-factor authentication'}
              </button>
            </>
          )}

          {/* ── Not yet protected ─────────────────────────────────────────── */}
          {!enrolled && !pendingFactorId && (
            <>
              <p className="mb-2 font-medium text-slate-900">Not enabled</p>
              <p className="mb-6 text-sm text-slate-600">
                Your admin account is protected by a password alone. Anyone who
                learns that password has full access to orders, pricing and
                customer details.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={busy}
                className="rounded-xl bg-[#8A5A6A] px-6 py-3 font-semibold text-white transition hover:bg-[#734757] disabled:opacity-50"
              >
                {busy ? 'Preparing…' : 'Set up two-factor authentication'}
              </button>
            </>
          )}

          {/* ── Mid-enrolment ─────────────────────────────────────────────── */}
          {pendingFactorId && (
            <>
              <p className="mb-4 text-sm text-slate-700">
                Scan this with Google Authenticator, 1Password, Authy or similar,
                then enter the 6-digit code it shows.
              </p>

              {/* Supabase returns the QR as an SVG data URI. */}
              {qrSvg && (
                <img
                  src={qrSvg}
                  alt="Two-factor authentication QR code"
                  className="mb-4 h-48 w-48 rounded-lg border border-slate-200 bg-white p-2"
                />
              )}

              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Or enter this key manually
              </p>
              <code className="mb-6 block break-all rounded-lg bg-slate-50 p-3 text-sm">
                {secret}
              </code>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="mb-4 w-full rounded-xl border p-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#8A5A6A]"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy || code.length !== 6}
                  className="flex-1 rounded-xl bg-[#8A5A6A] py-3 font-semibold text-white transition hover:bg-[#734757] disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingFactorId(null); setQrSvg(''); setSecret(''); setCode(''); setError(''); }}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Key, Lock, ArrowRight, CheckCircle2, Mail } from 'lucide-react';

export default function Signin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [step, setStep] = useState(1); // 1 = Credentials, 2 = 2FA Challenge
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [unverifiedUserId, setUnverifiedUserId] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Step 1: Validate primary credentials and issue 2FA challenge via Gmail
  const handlePrimarySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setUnverifiedUserId('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok && data.require2FA) {
        setStep(2);
        setUserId(data.userId);
        setMaskedEmail(data.maskedEmail || '');
        setSuccess(data.message || 'Primary credentials verified. A 6-digit OTP has been sent to your email.');
      } else {
        if (data.requireEmailVerification && data.userId) {
          setUnverifiedUserId(data.userId);
        }
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Validate 2FA code and obtain anti-hijacking session token
  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: twoFactorCode }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        if (data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/posts');
        }
      } else {
        setError(data.message || '2FA verification failed');
      }
    } catch (err) {
      setError('An error occurred during 2FA verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Sign in to Connected
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Or{' '}
          <Link href="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
            register a new encrypted account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg text-sm">
              <div>{error}</div>
              {unverifiedUserId && (
                <div className="mt-2 pt-2 border-t border-rose-500/20">
                  <Link
                    href={`/verify-email?userId=${unverifiedUserId}`}
                    className="inline-flex items-center text-xs font-semibold text-rose-200 underline hover:text-white"
                  >
                    Click here to enter your 6-digit verification code →
                  </Link>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* STEP 1: Primary Credentials */}
          {step === 1 ? (
            <form className="space-y-5" onSubmit={handlePrimarySubmit}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-semibold">
                  Step 1 of 2: Primary Credentials
                </span>
                <span className="text-xs text-slate-500">Salted Hash Verification</span>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email Address or Username
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    placeholder="alice or user@example.com"
                    className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  {isLoading ? 'Verifying Credentials...' : 'Proceed to Two-Step Auth'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Two-Step Authentication (2FA) */
            <form className="space-y-5" onSubmit={handleTwoFactorSubmit}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                  Step 2 of 2: Two-Step Authentication (2FA)
                </span>
                <span className="text-xs text-slate-500">Email OTP</span>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-lg text-xs text-emerald-300 flex items-start space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white">One-Time Passcode Sent:</span> A 6-digit 2FA login code has been sent to your registered Gmail address {maskedEmail ? `(${maskedEmail})` : ''}. Please check your inbox.
                </div>
              </div>

              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-slate-300">
                  Enter 6-Digit 2FA Code
                </label>
                <div className="mt-1">
                  <input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className="block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-mono text-lg tracking-widest"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length < 6}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition"
                >
                  {isLoading ? 'Validating 2FA...' : 'Verify & Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1 transition"
                >
                  ← Back to Primary Credentials
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
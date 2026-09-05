'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, CheckCircle2 } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId') || '';

  const [userId, setUserId] = useState(initialUserId);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Email successfully verified! Redirecting to sign in...');
        setTimeout(() => {
          router.push('/signin');
        }, 1500);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!initialUserId && (
        <div>
          <label className="block text-xs font-medium text-slate-300">User Account ID</label>
          <input
            type="text"
            required
            placeholder="Paste User ID from registration"
            className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300">6-Digit Verification Code</label>
        <input
          type="text"
          maxLength={6}
          required
          placeholder="123456"
          className="mt-1 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-center text-lg tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || code.length < 6}
        className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition"
      >
        {isLoading ? 'Verifying...' : 'Confirm Verification'}
      </button>

      <div className="mt-4 text-center">
        <Link href="/signin" className="text-xs text-indigo-400 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Verify Email Address
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter the verification code sent to your email by Nodemailer.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          <Suspense fallback={<div className="text-center text-xs text-slate-500 py-4">Loading verification form...</div>}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';

export default function Signup() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    address: '',
    role: 'user',
  });
  const [step, setStep] = useState(1); // 1 = Registration form, 2 = Nodemailer Email Verification
  const [userId, setUserId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setUserId(data.userId);
        setStep(2);
        setSuccess('Account created! A 6-digit verification code has been dispatched to your email.');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: emailCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Email verified successfully! Redirecting to sign in...');
        setTimeout(() => {
          router.push('/signin');
        }, 1500);
      } else {
        setError(data.message || 'Email verification failed');
      }
    } catch (err) {
      setError('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resend: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('New verification code sent to your email!');
      } else {
        setError(data.message || 'Failed to resend email');
      }
    } catch (e) {
      setError('Error resending email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          {step === 1 ? 'Create Encrypted Account' : 'Verify Your Email'}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {step === 1 ? (
            <>
              Already registered?{' '}
              <Link href="/signin" className="font-medium text-indigo-400 hover:text-indigo-300">
                Sign in here
              </Link>
            </>
          ) : (
            `Verification code sent to ${form.email}`
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Registration Form */
            <>
              <div className="mb-5 p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-lg text-xs text-indigo-300 flex items-start space-x-2">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <span className="font-semibold text-white">Asymmetric RSA + Email Verification:</span> Personal data is encrypted with Scratch RSA; an activation OTP code is sent via Gmail.
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSignupSubmit}>
                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-slate-300">
                    Username (Encrypted via RSA)
                  </label>
                  <div className="mt-1">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="johndoe"
                      className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={form.username}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-slate-300">
                    Full Legal Name (Encrypted via RSA)
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="Johnathan Doe"
                      className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={form.fullName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                    Email Address (Nodemailer OTP Recipient)
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-xs font-medium text-slate-300">
                    Contact Address (Encrypted via RSA)
                  </label>
                  <div className="mt-1">
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      placeholder="House 12, Road 4, Dhaka, Bangladesh"
                      className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                    Password (Scratch Multi-Round Salted Hash)
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
                  <label htmlFor="role" className="block text-xs font-medium text-slate-300">
                    Account Role (RBAC)
                  </label>
                  <div className="mt-1">
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="user">Regular User (Manage own posts & profile)</option>
                      <option value="admin">System Administrator (KMM Key Rotation & User Audits)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                  >
                    {isLoading ? 'Sending Verification Code...' : 'Register & Send Code'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* STEP 2: Real Email Verification Form */
            <form className="space-y-5" onSubmit={handleVerifyEmailSubmit}>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono uppercase tracking-wider pb-2 border-b border-slate-800">
                <Mail className="w-4 h-4" />
                <span>Email Verification</span>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-lg text-xs text-indigo-300 flex items-start space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <span className="font-semibold text-white">Verification Code Sent:</span> A 6-digit OTP code has been sent to <strong>{form.email}</strong>. Please check your inbox.
                </div>
              </div>

              <div>
                <label htmlFor="emailCode" className="block text-sm font-medium text-slate-300">
                  Enter 6-Digit Email Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="emailCode"
                    name="emailCode"
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className="block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-mono text-lg tracking-widest"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isLoading || emailCode.length < 6}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition"
                >
                  {isLoading ? 'Verifying...' : 'Verify Email & Activate Account'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResend}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError('');
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Edit Registration Info
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

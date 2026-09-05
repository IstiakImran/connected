'use client';

import Link from 'next/link';
import { Shield, Key, Lock, CheckCircle2, RefreshCw, Users, ShieldAlert, Cpu } from 'lucide-react';

export default function Home() {
  const securityModules = [
    {
      name: 'Algorithm 1: Pure Scratch RSA',
      description: 'Used for User Identity, Profile PII, and credentials. Built from scratch with BigInt Miller-Rabin primality and modular exponentiation.',
      icon: Lock,
      badge: 'Identity & PII',
    },
    {
      name: 'Algorithm 2: Pure Scratch ECC',
      description: 'secp256k1 Weierstrass curve arithmetic ($y^2 = x^3 + 7 \\pmod p$) with ElGamal-style asymmetric encryption for posts, feeds, and messaging.',
      icon: Cpu,
      badge: 'Posts & Feeds',
    },
    {
      name: 'Key Management Module (KMM)',
      description: 'Automated asymmetric key generation, encrypted private key storage, secure public distribution, and admin-triggered key rotation.',
      icon: Key,
      badge: 'Lifecycle & Rotation',
    },
    {
      name: 'Message Authentication Codes (MAC)',
      description: 'Custom HMAC-SHA256 implemented from scratch to guarantee message integrity and immediately detect database tampering.',
      icon: ShieldAlert,
      badge: 'Data Integrity',
    },
    {
      name: 'Two-Step Authentication (2FA)',
      description: 'Strict two-stage login enforcing primary credential verification followed by a time-limited one-time verification code.',
      icon: CheckCircle2,
      badge: 'Access Control',
    },
    {
      name: 'Anti-Hijacking Sessions & RBAC',
      description: 'Token binding with client environmental fingerprints (IP + User-Agent) preventing session hijacking, and Admin vs User privilege separation.',
      icon: Users,
      badge: 'Session Defense',
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-mono uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>CSE447 Information Security Lab</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
              Connected: <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Dual Asymmetric</span> Social Platform
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              An end-to-end encrypted platform operating <strong className="text-white">exclusively under asymmetric cryptography</strong>. Features from-scratch mathematical <strong className="text-indigo-300">RSA</strong>, <strong className="text-purple-300">ECC</strong>, and <strong className="text-emerald-300">HMAC-SHA256</strong> with zero symmetric ciphers.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="px-6 py-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition"
              >
                Create Encrypted Account
              </Link>
              <Link
                href="/signin"
                className="px-6 py-3 rounded-lg text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition"
              >
                Sign In with 2FA
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Grid */}
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-mono tracking-widest text-indigo-400 font-bold">
            Defense In Depth
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Strict Laboratory Requirement Compliance
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Every security primitive is implemented from first mathematical principles without built-in library shortcuts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityModules.map((module) => (
            <div
              key={module.name}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 hover:border-slate-700 transition shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-lg text-indigo-400">
                  <module.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {module.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{module.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
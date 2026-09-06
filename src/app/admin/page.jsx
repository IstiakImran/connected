'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, RefreshCw, Users, ShieldAlert, CheckCircle2, Lock, ArrowRight, Trash2, ShieldCheck, MessageSquare, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [kmmData, setKmmData] = useState(null);
  const [postsList, setPostsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }

      // Check current session & admin status
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        router.push('/signin');
        return;
      }
      const me = await meRes.json();
      if (me.role !== 'admin') {
        router.push('/profile');
        return;
      }

      // Fetch KMM info
      const kmmRes = await fetch('/api/kmm', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (kmmRes.ok) {
        const data = await kmmRes.json();
        setKmmData(data);
      }

      // Fetch users
      const usersRes = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setAdminData(uData);
      }

      // Fetch posts for moderation
      const postsRes = await fetch('/api/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (postsRes.ok) {
        const pData = await postsRes.json();
        setPostsList(pData.posts || []);
      }
    } catch (err) {
      setError('Failed to fetch admin telemetry: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRotateKeys = async () => {
    if (!confirm('Are you sure you want to rotate system asymmetric keys? A new version of RSA and ECC keys will be generated.')) {
      return;
    }

    setRotating(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kmm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Keys successfully rotated.');
        fetchData();
      } else {
        setError(data.message || 'Key rotation failed.');
      }
    } catch (err) {
      setError('Error triggering key rotation');
    } finally {
      setRotating(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (res.ok) {
        setMessage(`User role updated to ${newRole}`);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to update role');
      }
    } catch (e) {
      setError('Error updating user role');
    }
  };

  const handleDeleteUserByAdmin = async (userId, username) => {
    if (!confirm(`Are you sure you want to permanently delete user @${username}? All their encrypted posts and data will be removed.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || `User @${username} deleted.`);
        fetchData();
      } else {
        setError(data.message || 'Failed to delete user.');
      }
    } catch (e) {
      setError('Error deleting user');
    }
  };

  const handleDeletePostByAdmin = async (postId) => {
    if (!confirm('Are you sure you want to delete/moderate this encrypted post as Administrator?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Post successfully deleted by Administrator.');
        fetchData();
      } else {
        setError(data.message || 'Failed to delete post.');
      }
    } catch (e) {
      setError('Error deleting post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-5 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-7 h-7 text-amber-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Administrator Security Dashboard
              </h1>
              <span className="text-xs uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-mono font-bold">
                RBAC: Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Key Management Module (KMM) control, cryptographic lifecycle, and Role-Based Access Control.
            </p>
          </div>

          <button
            onClick={handleRotateKeys}
            disabled={rotating}
            className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition shadow disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${rotating ? 'animate-spin' : ''}`} />
            {rotating ? 'Generating & Rotating...' : 'Trigger KMM Key Rotation'}
          </button>
        </div>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* SECTION 1: Key Management Module (KMM) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Keys Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Active KMM Keys</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
                Live
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-800">
                <div className="text-xs font-medium text-slate-400">Algorithm 1 (Identity/Profile)</div>
                <div className="text-sm font-bold text-white mt-0.5">Pure Scratch RSA</div>
                <div className="text-xs font-mono text-indigo-400 mt-1">
                  Active Version: {kmmData?.publicKeys?.RSA?.version || 'v1'}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-800">
                <div className="text-xs font-medium text-slate-400">Algorithm 2 (Posts/Feeds)</div>
                <div className="text-sm font-bold text-white mt-0.5">Pure Scratch ECC (secp256k1)</div>
                <div className="text-xs font-mono text-emerald-400 mt-1">
                  Active Version: {kmmData?.publicKeys?.ECC?.version || 'v1'}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-800">
                <div className="text-xs font-medium text-slate-400">Data Integrity Mechanism</div>
                <div className="text-sm font-bold text-white mt-0.5">Pure Scratch HMAC-SHA256</div>
                <div className="text-xs text-slate-400 mt-1">
                  Payload signing & constant-time verification
                </div>
              </div>
            </div>
          </div>

          {/* Key Rotation History */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>KMM Key Rotation Audit Log</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {kmmData?.rotationHistory?.length || 0} Key Entries
              </span>
            </div>

            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase font-mono">
                    <th className="pb-2">Algorithm</th>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2">Rotated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {kmmData?.rotationHistory?.map((k, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-white">{k.algorithm}</td>
                      <td className="py-2.5 font-mono text-indigo-300">{k.version}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            k.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {k.isActive ? 'Active' : 'Retired'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5 text-slate-500">
                        {k.rotatedAt ? new Date(k.rotatedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 2: RBAC User Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Registered Accounts & Role-Based Access Control</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Users: {adminData?.totalUsers || 0} | Total Posts: {adminData?.totalPosts || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase font-mono">
                  <th className="pb-2">Decrypted Username</th>
                  <th className="pb-2">Decrypted Email</th>
                  <th className="pb-2">Assigned Role (RBAC)</th>
                  <th className="pb-2">2FA Status</th>
                  <th className="pb-2">Registered</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {adminData?.users?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-white font-mono">{u.username}</td>
                    <td className="py-3 text-slate-400">{u.email}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] uppercase font-bold ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-emerald-400 font-mono">Enforced (2FA)</td>
                    <td className="py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="px-2.5 py-1 text-[11px] rounded border border-slate-700 hover:bg-slate-800 transition text-slate-200"
                        >
                          Change to {u.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUserByAdmin(u.id, u.username)}
                          title="Delete User Account"
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded border border-rose-900/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Content Moderation & HMAC Integrity Monitor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Encrypted Posts Moderation & HMAC Data Integrity Monitor</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {postsList.length} Total Posts Monitored
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase font-mono">
                  <th className="pb-2">Author</th>
                  <th className="pb-2">Decrypted Content</th>
                  <th className="pb-2">ECC Key Version</th>
                  <th className="pb-2">HMAC Integrity</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {postsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500">
                      No posts available for moderation.
                    </td>
                  </tr>
                ) : (
                  postsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-semibold text-white font-mono">
                        @{p.author?.username || 'Unknown'}
                      </td>
                      <td className="py-3 max-w-xs truncate text-slate-200">
                        {p.content}
                      </td>
                      <td className="py-3 font-mono text-indigo-300">
                        {p.keyVersion || 'v1'}
                      </td>
                      <td className="py-3">
                        {p.integrityVerified ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 bg-emerald-950/70 border border-emerald-700/60 rounded text-emerald-300">
                            <ShieldCheck className="w-3 h-3" />
                            <span>MAC Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 bg-rose-950/70 border border-rose-700/60 rounded text-rose-300">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Tamper Alert</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeletePostByAdmin(p.id)}
                          className="inline-flex items-center px-2 py-1 text-[11px] rounded bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 transition"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Moderate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

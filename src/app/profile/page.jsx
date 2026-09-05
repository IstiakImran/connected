'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Lock, Edit3, Check, X, LogOut, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', address: '' });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm({ fullName: data.fullName, address: data.address });
      } else {
        localStorage.removeItem('token');
        router.push('/signin');
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Profile updated and re-encrypted with Scratch RSA successfully.');
        setIsEditing(false);
        fetchProfile();
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Security Banner */}
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-900/60 rounded-lg text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Algorithm 1: Scratch RSA Protection Active</div>
              <div className="text-xs text-indigo-300/80">
                User identity attributes are decrypted in memory upon authorized retrieval; stored strictly as RSA ciphertext.
              </div>
            </div>
          </div>
          <span className="text-xs font-mono uppercase bg-indigo-900/80 border border-indigo-700 text-indigo-200 px-2.5 py-1 rounded">
            2FA Protected
          </span>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Your Encrypted Identity Profile</h3>
              <p className="text-xs text-slate-400">View and update your personal data securely.</p>
            </div>
            <div className="flex items-center space-x-3">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-700 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                  Edit Profile
                </button>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-rose-900/40 text-xs font-medium rounded-lg text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 transition"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Logout
              </button>
            </div>
          </div>

          <div className="p-6">
            {isEditing ? (
              /* Profile Update Form */
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300">
                  <span className="font-semibold text-indigo-400">Notice:</span> Updating your profile will automatically re-encrypt your information using the current active Scratch RSA key version before saving to the database.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Contact Address</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50"
                  >
                    {isSaving ? 'Re-encrypting...' : 'Save & Re-encrypt'}
                  </button>
                </div>
              </form>
            ) : (
              /* Profile View Details */
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Username</dt>
                  <dd className="mt-1 text-sm font-semibold text-white font-mono">{profile.username}</dd>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Role-Based Access (RBAC)</dt>
                  <dd className="mt-1 flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        profile.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {profile.role}
                    </span>
                    {profile.role === 'admin' && (
                      <span className="text-[11px] text-amber-400/80">Authorized for KMM Key Rotation</span>
                    )}
                  </dd>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Full Name</dt>
                  <dd className="mt-1 text-sm text-slate-200">{profile.fullName}</dd>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Email Address</dt>
                  <dd className="mt-1 text-sm text-slate-200">{profile.email}</dd>
                </div>

                <div className="sm:col-span-2 bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Contact Address</dt>
                  <dd className="mt-1 text-sm text-slate-200">{profile.address}</dd>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Two-Factor Authentication</dt>
                  <dd className="mt-1 text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enforced via OTP Challenge</span>
                  </dd>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
                  <dt className="text-xs font-medium text-slate-400">Account Created</dt>
                  <dd className="mt-1 text-xs text-slate-400">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
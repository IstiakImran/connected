// /src/app/users/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  User,
  MessageSquare,
  Lock,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function UserProfilePage() {
  const { sendLiveNotification } = useSocket();
  const router = useRouter();
  const params = useParams();
  const userId = params?.id;

  const [userData, setUserData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUserProfile = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/signin');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setUserData(data.user);
        setConnectionStatus(data.connectionStatus);
        setPosts(data.posts || []);
      } else {
        setError(data.message || 'Failed to load user profile');
      }
    } catch (err) {
      setError('An error occurred: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const handleConnectionAction = async (action) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: userId, action }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        if (action === 'request') {
          sendLiveNotification(userId, {
            type: 'connection',
            title: 'New Connection Request',
            message: 'You have received a new connection request!',
            link: '/users',
          });
        } else if (action === 'accept') {
          sendLiveNotification(userId, {
            type: 'connection',
            title: 'Connection Accepted',
            message: 'Your connection request was accepted!',
            link: '/users',
          });
        }
        await fetchUserProfile();
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
        <span>Loading user profile & encrypted posts...</span>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 flex flex-col items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Profile Unavailable</h2>
          <p className="text-xs text-rose-300">{error}</p>
          <Link
            href="/users"
            className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to People Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Link href="/users" className="hover:text-indigo-400 flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>People Directory</span>
          </Link>
          <span>/</span>
          <span className="text-slate-200">@{userData?.username}</span>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-2xl shadow-lg border border-indigo-500/30">
                {userData?.username.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-extrabold text-white">{userData?.username}</h1>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      userData?.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {userData?.role}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Legal Name (Decrypted via RSA):{' '}
                  <span className="text-slate-200 font-medium">{userData?.fullName}</span>
                </p>

                <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Member since {new Date(userData?.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{posts.length} Posts</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Relationship Status & Actions */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'self' ? (
                <Link
                  href="/profile"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Edit My Profile
                </Link>
              ) : connectionStatus === 'accepted' ? (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/messages"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </Link>

                  <button
                    onClick={() => handleConnectionAction('remove')}
                    disabled={isActionLoading}
                    className="px-3 py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition"
                  >
                    Unfriend
                  </button>
                </div>
              ) : connectionStatus === 'pending_sent' ? (
                <button
                  onClick={() => handleConnectionAction('cancel')}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cancel Request</span>
                </button>
              ) : connectionStatus === 'pending_received' ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleConnectionAction('accept')}
                    disabled={isActionLoading}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Request</span>
                  </button>
                  <button
                    onClick={() => handleConnectionAction('reject')}
                    disabled={isActionLoading}
                    className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnectionAction('send')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User's Posts Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Posts by @{userData?.username} ({posts.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Algorithm 2 (ECC) Decrypted</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              This user has not published any encrypted posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>{userData?.username}</span>
                      <span>•</span>
                      <time dateTime={post.createdAt}>
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-indigo-300">
                        Key: {post.keyVersion}
                      </span>

                      {post.integrityVerified ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 bg-emerald-950/70 border border-emerald-700/60 rounded text-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          <span>MAC Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 bg-rose-950/70 border border-rose-700/60 rounded text-rose-300">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Integrity Failed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

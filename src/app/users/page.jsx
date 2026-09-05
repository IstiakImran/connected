// /src/app/users/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Shield,
  Check,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function UsersDirectory() {
  const router = useRouter();
  const { sendLiveNotification } = useSocket();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'pending' | 'friends'
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/signin');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Fetch all users directory
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 2. Fetch connection relations (friends, incoming, outgoing)
      const connRes = await fetch('/api/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (usersRes.ok && connRes.ok) {
        const uData = await usersRes.json();
        const cData = await connRes.json();

        setUsers(uData.users || []);
        setFriends(cData.friends || []);
        setIncomingRequests(cData.incomingRequests || []);
        setOutgoingRequests(cData.outgoingRequests || []);
      } else if (usersRes.status === 401 || connRes.status === 401) {
        localStorage.removeItem('token');
        router.push('/signin');
      }
    } catch (err) {
      setError('Failed to load user directory: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleConnectionAction = async (targetUserId, action) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, action }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        if (action === 'request') {
          sendLiveNotification(targetUserId, {
            type: 'connection',
            title: 'New Connection Request',
            message: 'You have received a new connection request!',
            link: '/users',
          });
        } else if (action === 'accept') {
          sendLiveNotification(targetUserId, {
            type: 'connection',
            title: 'Connection Accepted',
            message: 'Your connection request was accepted!',
            link: '/users',
          });
        }
        await loadData();
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Filter users by search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <Users className="w-7 h-7 text-indigo-400" />
              <span>People & Connections</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Find peers, send secure connection requests, and access user post feeds.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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

        {/* Search Bar & Tabs */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Navigation Tabs */}
          <div className="flex space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'discover'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Discover People ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition relative flex items-center space-x-1.5 ${
                activeTab === 'pending'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Requests</span>
              {incomingRequests.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'friends'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Connections ({friends.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tab 1: Discover People */}
        {activeTab === 'discover' && (
          <div>
            {isLoading ? (
              <div className="text-center py-16 text-slate-500 text-xs flex justify-center items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading users directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No users found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const isBusy = actionLoading[u.id];

                  return (
                    <div
                      key={u.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold text-base shadow">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/users/${u.id}`}
                              className="font-bold text-sm text-white hover:text-indigo-400 transition flex items-center space-x-1"
                            >
                              <span>{u.username}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 hover:text-indigo-400" />
                            </Link>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  u.role === 'admin'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Joined {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <Link
                          href={`/users/${u.id}`}
                          className="flex-1 text-center py-2 px-3 bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 rounded-lg transition"
                        >
                          View Posts
                        </Link>

                        {u.connectionStatus === 'accepted' ? (
                          <div className="flex items-center space-x-1">
                            <Link
                              href="/messages"
                              className="p-2 bg-emerald-950 border border-emerald-700/60 text-emerald-400 hover:bg-emerald-900 rounded-lg transition"
                              title="Chat with user"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Link>
                            <span className="text-[11px] text-emerald-400 px-2 py-1 bg-emerald-950/60 border border-emerald-800 rounded font-semibold flex items-center space-x-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Friends</span>
                            </span>
                          </div>
                        ) : u.connectionStatus === 'pending_sent' ? (
                          <button
                            onClick={() => handleConnectionAction(u.id, 'cancel')}
                            disabled={isBusy}
                            className="py-2 px-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-xs font-semibold text-slate-400 rounded-lg transition flex items-center space-x-1"
                          >
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Cancel</span>
                          </button>
                        ) : u.connectionStatus === 'pending_received' ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleConnectionAction(u.id, 'accept')}
                              disabled={isBusy}
                              className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleConnectionAction(u.id, 'reject')}
                              disabled={isBusy}
                              className="py-1.5 px-2 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConnectionAction(u.id, 'send')}
                            disabled={isBusy}
                            className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Pending Requests */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Incoming Friend Requests ({incomingRequests.length})</span>
              </h2>

              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No pending incoming friend requests at this time.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                          {req.sender.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/users/${req.sender.userId}`}
                            className="text-sm font-bold text-white hover:text-indigo-400"
                          >
                            {req.sender.username}
                          </Link>
                          <div className="text-[11px] text-slate-500">
                            Requested {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleConnectionAction(req.sender.userId, 'accept')}
                          disabled={actionLoading[req.sender.userId]}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleConnectionAction(req.sender.userId, 'reject')}
                          disabled={actionLoading[req.sender.userId]}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg text-xs flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Sent Requests ({outgoingRequests.length})</span>
              </h2>

              {outgoingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  You have no pending sent requests.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                          {req.targetUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/users/${req.targetUser.userId}`}
                            className="text-sm font-bold text-white hover:text-indigo-400"
                          >
                            {req.targetUser.username}
                          </Link>
                          <div className="text-[11px] text-slate-500">
                            Sent on {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConnectionAction(req.targetUser.userId, 'cancel')}
                        disabled={actionLoading[req.targetUser.userId]}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-semibold"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: My Connections */}
        {activeTab === 'friends' && (
          <div>
            {filteredFriends.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No connections yet. Discover people to connect and build your secure network!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.connectionId}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-bold text-lg shadow">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/users/${friend.userId}`}
                          className="font-bold text-sm text-white hover:text-indigo-400 flex items-center space-x-1"
                        >
                          <span>{friend.username}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                        <div className="text-[11px] text-emerald-400 font-medium">
                          Connected Friend
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <Link
                        href={`/users/${friend.userId}`}
                        className="flex-1 text-center py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition"
                      >
                        View Posts
                      </Link>

                      <Link
                        href="/messages"
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </Link>

                      <button
                        onClick={() => handleConnectionAction(friend.userId, 'remove')}
                        title="Remove connection"
                        className="p-2 bg-slate-800 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

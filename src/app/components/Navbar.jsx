// /app/components/Navbar.jsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Shield, User, MessageSquare, LogOut, Lock, Key, ShieldAlert, Users, Bell, MessageCircle, ThumbsUp, UserPlus, Trash2, X } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadMessageCount, notifications, dismissNotification, clearAllNotifications } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken);

    if (!storedToken) {
      setCurrentUser(null);
      setPendingCount(0);
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
        }
      } catch (e) {
        console.error('Navbar auth fetch error:', e);
      }
    };

    const fetchPendingConnections = async () => {
      try {
        const res = await fetch('/api/connections', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.pendingCount || 0);
        }
      } catch (e) {
        // silent fail
      }
    };

    fetchMe();
    fetchPendingConnections();
  }, [pathname]);

  // Sync connection count when connection notification arrives
  useEffect(() => {
    if (!token || !notifications || notifications.length === 0) return;
    const hasConnectionNotif = notifications.some((n) => n.type === 'connection');
    if (hasConnectionNotif) {
      fetch('/api/connections', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.pendingCount !== undefined) setPendingCount(data.pendingCount);
        })
        .catch(() => {});
    }
  }, [notifications, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    router.push('/signin');
  };

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-indigo-400 hover:text-indigo-300">
              <Shield className="h-6 w-6 text-indigo-400" />
              <span>Connected</span>
              <span className="text-xs uppercase px-2 py-0.5 bg-indigo-900/60 border border-indigo-700 text-indigo-300 rounded font-mono">
                Dual Asymmetric
              </span>
            </Link>

            <div className="hidden sm:flex sm:space-x-4">
              <Link
                href="/"
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                Home
              </Link>

              {isMounted && token && (
                <>
                  <Link
                    href="/posts"
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/posts') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-400" />
                    Posts (ECC)
                  </Link>

                  <Link
                    href="/users"
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition relative ${
                      isActive('/users') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-1.5 text-indigo-400" />
                    <span>People</span>
                    {pendingCount > 0 && (
                      <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/messages"
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/messages') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="relative mr-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Live Chat (P2P)</span>
                    {isMounted && unreadMessageCount > 0 && (
                      <span className="ml-1.5 bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        {unreadMessageCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/profile"
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive('/profile') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <User className="h-4 w-4 mr-1.5 text-indigo-400" />
                    Profile (RSA)
                  </Link>

                  {currentUser?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        isActive('/admin') ? 'bg-indigo-700 text-white' : 'bg-indigo-900/40 border border-indigo-700/60 text-indigo-300 hover:bg-indigo-800/60'
                      }`}
                    >
                      <Key className="h-4 w-4 mr-1.5 text-amber-400" />
                      Admin & KMM
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isMounted ? (
              token ? (
                <div className="flex items-center space-x-3">
                  {/* Notification Bell Dropdown Button */}
                  <div className="relative" ref={notifRef}>
                    <button
                      type="button"
                      onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                      className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5 text-amber-400" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
                          {notifications.length}
                        </span>
                      )}
                    </button>

                    {showNotificationsDropdown && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                          <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white">Notifications</span>
                            {notifications.length > 0 && (
                              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded-full">
                                {notifications.length}
                              </span>
                            )}
                          </div>
                          {notifications.length > 0 && (
                            <button
                              onClick={clearAllNotifications}
                              className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear all</span>
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 space-y-1.5">
                              <Bell className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                              <p className="text-xs font-medium text-slate-400">No new notifications</p>
                              <p className="text-[11px] text-slate-500">You're all caught up!</p>
                            </div>
                          ) : (
                            notifications.map((notif) => {
                              const getIcon = () => {
                                switch (notif.type) {
                                  case 'message':
                                    return <MessageSquare className="w-4 h-4 text-sky-400" />;
                                  case 'connection':
                                    return <UserPlus className="w-4 h-4 text-indigo-400" />;
                                  case 'comment':
                                    return <MessageCircle className="w-4 h-4 text-emerald-400" />;
                                  case 'vote':
                                  case 'post':
                                    return <ThumbsUp className="w-4 h-4 text-amber-400" />;
                                  default:
                                    return <Bell className="w-4 h-4 text-indigo-300" />;
                                }
                              };

                              const handleItemClick = () => {
                                setShowNotificationsDropdown(false);
                                dismissNotification(notif.id);
                                if (notif.link) {
                                  router.push(notif.link);
                                }
                              };

                              return (
                                <div
                                  key={notif.id}
                                  onClick={handleItemClick}
                                  className="p-3 hover:bg-slate-800/60 transition cursor-pointer flex items-start space-x-3 group text-left"
                                >
                                  <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700/60 group-hover:border-indigo-500/50 transition mt-0.5 flex-shrink-0">
                                    {getIcon()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-white truncate font-mono">
                                        {notif.title || 'Notification'}
                                      </p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          dismissNotification(notif.id);
                                        }}
                                        className="text-slate-500 hover:text-slate-300 p-0.5 ml-1"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-snug">
                                      {notif.message}
                                    </p>
                                    <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {currentUser && (
                    <span className="hidden md:inline-flex items-center space-x-1.5 text-xs bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 text-slate-300">
                      <span className="font-semibold text-white">{currentUser.username}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                          currentUser.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {currentUser.role}
                      </span>
                    </span>
                  )}

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-700 text-sm font-medium rounded-md text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white focus:outline-none transition"
                  >
                    <LogOut className="h-4 w-4 mr-1.5 text-rose-400" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/signin"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 transition shadow"
                  >
                    Register
                  </Link>
                </div>
              )
            ) : (
              <div className="h-8 w-24" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

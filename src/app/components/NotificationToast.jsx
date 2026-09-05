// /src/app/components/NotificationToast.jsx
'use client';

import React, { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useRouter } from 'next/navigation';
import { MessageSquare, UserPlus, Shield, X, ArrowRight, Bell, ThumbsUp, MessageCircle, Heart } from 'lucide-react';

function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may require user interaction first
  }
}

export default function NotificationToast() {
  const { notifications, dismissNotification } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (notifications.length === 0) return;

    // Play subtle chime on arrival
    playNotificationChime();

    // Auto-dismiss the oldest notification after 6 seconds
    const timer = setTimeout(() => {
      if (notifications.length > 0) {
        dismissNotification(notifications[notifications.length - 1].id);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [notifications, dismissNotification]);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const getIcon = () => {
          switch (notif.type) {
            case 'message':
              return <MessageSquare className="w-5 h-5 text-sky-400 flex-shrink-0" />;
            case 'connection':
              return <UserPlus className="w-5 h-5 text-indigo-400 flex-shrink-0" />;
            case 'comment':
            case 'reply':
              return <MessageCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
            case 'post':
            case 'vote':
              return <ThumbsUp className="w-5 h-5 text-amber-400 flex-shrink-0" />;
            default:
              return <Bell className="w-5 h-5 text-indigo-300 flex-shrink-0" />;
          }
        };

        const handleClick = () => {
          dismissNotification(notif.id);
          if (notif.link) {
            router.push(notif.link);
          }
        };

        return (
          <div
            key={notif.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-3.5 flex items-start space-x-3 text-slate-100 transition transform hover:-translate-y-0.5 animate-in fade-in slide-in-from-top-4 duration-200"
          >
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700/60">
              {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate font-mono">
                  {notif.title || 'Notification'}
                </span>
                <button
                  onClick={() => dismissNotification(notif.id)}
                  className="text-slate-400 hover:text-white transition p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                {notif.message}
              </p>

              {notif.link && (
                <button
                  onClick={handleClick}
                  className="mt-2 inline-flex items-center text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition group"
                >
                  <span>{notif.type === 'message' ? 'Open Chat' : 'View'}</span>
                  <ArrowRight className="w-3 h-3 ml-1 transition group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

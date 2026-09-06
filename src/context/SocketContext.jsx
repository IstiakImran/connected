'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const MESSAGING_SERVER_URL =
  process.env.NEXT_PUBLIC_MESSAGING_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : 'https://cse447-messaging-server.onrender.com');

export function SocketProvider({ children }) {
  const pathname = usePathname();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingMap, setTypingMap] = useState({}); // userId -> boolean
  const [latestMessage, setLatestMessage] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messageStatusMap, setMessageStatusMap] = useState({}); // messageId -> { status, deliveredAt, readAt }
  const [readReceiptMap, setReadReceiptMap] = useState({}); // recipientId -> readAt
  const [activeConversationUserId, setActiveConversationUserId] = useState(null);

  const socketRef = useRef(null);
  const activeConversationUserIdRef = useRef(null);

  // Keep ref in sync for event callbacks
  useEffect(() => {
    activeConversationUserIdRef.current = activeConversationUserId;
  }, [activeConversationUserId]);

  // Sync token whenever route changes or on mount
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setAuthToken(t);
  }, [pathname]);

  // Fetch persistent notifications on auth token ready
  useEffect(() => {
    if (!authToken) {
      setNotifications([]);
      return;
    }

    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.notifications) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {});
  }, [authToken]);

  const addNotification = useCallback((notif) => {
    const id = notif.id || 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newNotif = { ...notif, id, createdAt: notif.createdAt || new Date().toISOString() };
    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== id).slice(0, 29)]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isPersistentId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    if (token && isPersistentId) {
      fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ all: true }),
      }).catch(() => {});
    }
  }, []);

  const markConversationAsRead = useCallback(async (senderId) => {
    if (!senderId) return;

    // 1. Emit via socket
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('mark_messages_read', { senderId });
    }

    // 2. REST fallback to ensure persistence
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ senderId }),
        });
      }
    } catch (e) {
      console.warn('REST mark as read error:', e);
    }

    // Decrement unread count
    setUnreadMessageCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!authToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Express Socket.IO Messaging Server
    const s = io(MESSAGING_SERVER_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    s.on('connect', () => {
      console.log('[SocketProvider] Connected to Real-Time Messaging Server:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', (reason) => {
      console.log('[SocketProvider] Disconnected:', reason);
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[SocketProvider] Connection error to messaging server:', err.message);
      setIsConnected(false);
    });

    s.on('online_users', (userIds) => {
      setOnlineUserIds(userIds || []);
    });

    // 1. Delivery & Read Receipts from Server
    s.on('message_status_update', ({ messageId, status, deliveredAt }) => {
      setMessageStatusMap((prev) => ({
        ...prev,
        [messageId]: { status, deliveredAt },
      }));
    });

    s.on('messages_read_by_recipient', ({ recipientId, readAt }) => {
      setReadReceiptMap((prev) => ({
        ...prev,
        [recipientId]: readAt,
      }));
    });

    // 2. Incoming Direct Messages
    s.on('receive_direct_message', async (data) => {
      console.log('[SocketProvider] New direct message received live:', data);

      // Acknowledge delivery immediately to sender
      s.emit('message_delivered', { messageId: data.id, senderId: data.senderId });

      // Decrypt incoming message
      let decryptedText = '[Encrypted Message]';
      let integrityVerified = false;

      try {
        const token = localStorage.getItem('token');
        const decRes = await fetch('/api/messages/decrypt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (decRes.ok) {
          const decData = await decRes.json();
          decryptedText = decData.decryptedContent;
          integrityVerified = decData.integrityVerified;
        }
      } catch (e) {
        console.error('Decryption error on incoming message:', e);
      }

      const hydratedMessage = {
        ...data,
        content: decryptedText,
        integrityVerified,
        status: 'delivered',
      };

      setLatestMessage(hydratedMessage);

      // Check if recipient is actively chatting with sender
      const isViewingChat = activeConversationUserIdRef.current === data.senderId;

      if (isViewingChat) {
        // Automatically mark as read
        s.emit('mark_messages_read', { senderId: data.senderId });
      } else {
        // Increment unread count & show toast notification
        setUnreadMessageCount((prev) => prev + 1);
        addNotification({
          id: 'msg_' + data.id,
          type: 'message',
          title: 'Encrypted Message Received',
          message: decryptedText.length > 50 ? decryptedText.slice(0, 50) + '...' : decryptedText,
          senderId: data.senderId,
          link: `/messages?user=${data.senderId}`,
        });
      }
    });

    // 3. Generic Live Notifications (Friend Requests, Comments, Votes)
    s.on('receive_notification', (notif) => {
      console.log('[SocketProvider] Live notification received:', notif);
      addNotification(notif);
    });

    s.on('user_typing', ({ senderId }) => {
      setTypingMap((prev) => ({ ...prev, [senderId]: true }));
    });

    s.on('user_stopped_typing', ({ senderId }) => {
      setTypingMap((prev) => ({ ...prev, [senderId]: false }));
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [authToken, addNotification]);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUserIds.includes(userId.toString());
    },
    [onlineUserIds]
  );

  const sendMessage = useCallback(
    async (recipientId, plainText) => {
      if (!recipientId || !plainText || !plainText.trim()) return null;

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Not authenticated');

      // 1. Asymmetrically encrypt content via Scratch ECC & sign with Scratch HMAC
      const prepRes = await fetch('/api/messages/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId, content: plainText }),
      });

      if (!prepRes.ok) {
        const err = await prepRes.json();
        throw new Error(err.message || 'Failed to encrypt message');
      }

      const prepared = await prepRes.json();
      const tempId = 'temp_' + Date.now();

      // 2. Emit encrypted payload over WebSocket to Express Messaging Server
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_direct_message', {
          recipientId,
          encryptedContent: prepared.encryptedContent,
          mac: prepared.mac,
          keyVersion: prepared.keyVersion,
          createdAt: prepared.createdAt,
          tempId,
        });
      }

      return {
        id: tempId,
        senderId: prepared.senderId,
        recipientId,
        content: plainText, // local plaintext for sender
        rawCiphertextPreview: prepared.encryptedContent.slice(0, 30) + '...',
        mac: prepared.mac,
        keyVersion: prepared.keyVersion,
        integrityVerified: true,
        status: 'sent',
        read: false,
        delivered: false,
        createdAt: prepared.createdAt,
      };
    },
    []
  );

  const sendLiveNotification = useCallback((recipientId, notifData) => {
    // 1. Live WebSocket broadcast
    if (socketRef.current && socketRef.current.connected && recipientId) {
      socketRef.current.emit('send_notification', {
        recipientId,
        ...notifData,
      });
    }

    // 2. Persist to MongoDB Notification schema for offline & cross-session retrieval
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && recipientId) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId,
          type: notifData.type,
          title: notifData.title,
          message: notifData.message,
          link: notifData.link,
        }),
      }).catch((e) => console.warn('Notification persistence error:', e));
    }
  }, []);

  const startTyping = useCallback((recipientId) => {
    if (socketRef.current && socketRef.current.connected && recipientId) {
      socketRef.current.emit('typing', { recipientId });
    }
  }, []);

  const stopTyping = useCallback((recipientId) => {
    if (socketRef.current && socketRef.current.connected && recipientId) {
      socketRef.current.emit('stop_typing', { recipientId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isUserOnline,
        onlineUserIds,
        latestMessage,
        sendMessage,
        startTyping,
        stopTyping,
        typingMap,
        notifications,
        unreadMessageCount,
        messageStatusMap,
        readReceiptMap,
        activeConversationUserId,
        setActiveConversationUserId,
        markConversationAsRead,
        sendLiveNotification,
        addNotification,
        dismissNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}


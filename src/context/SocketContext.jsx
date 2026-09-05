'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const MESSAGING_SERVER_URL = process.env.NEXT_PUBLIC_MESSAGING_SERVER_URL || 'http://localhost:5001';

export function SocketProvider({ children }) {
  const pathname = usePathname();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingMap, setTypingMap] = useState({}); // userId -> boolean
  const [latestMessage, setLatestMessage] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const socketRef = useRef(null);

  // Sync token whenever route changes or on mount
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setAuthToken(t);
  }, [pathname]);

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

    s.on('receive_direct_message', async (data) => {
      console.log('[SocketProvider] New direct message received live:', data);
      // Decrypt incoming message
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
          setLatestMessage({
            ...data,
            content: decData.decryptedContent,
            integrityVerified: decData.integrityVerified,
          });
        } else {
          setLatestMessage(data);
        }
      } catch (e) {
        console.error('Decryption error on incoming message:', e);
        setLatestMessage(data);
      }
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
  }, [authToken]);

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
        createdAt: prepared.createdAt,
      };
    },
    []
  );

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

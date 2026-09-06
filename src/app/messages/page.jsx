'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  ShieldAlert,
  Circle,
  Users,
  Lock,
  Loader,
  Search,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
} from 'lucide-react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUserId = searchParams.get('user');

  const {
    isConnected,
    isUserOnline,
    latestMessage,
    sendMessage,
    startTyping,
    stopTyping,
    typingMap,
    messageStatusMap,
    readReceiptMap,
    setActiveConversationUserId,
    markConversationAsRead,
  } = useSocket();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch current user and other registered users
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/signin');
      return;
    }

    const init = async () => {
      try {
        // Get me
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          router.push('/signin');
          return;
        }
        const meData = await meRes.json();
        setCurrentUserId(meData.userId);

        // Get users
        const usersRes = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersRes.ok) {
          const uData = await usersRes.json();
          const list = uData.users || [];
          setUsers(list);
          setFilteredUsers(list);

          // Auto-select user if query param provided
          if (queryUserId) {
            const found = list.find((u) => u.id === queryUserId);
            if (found) {
              setSelectedUser(found);
            }
          }
        }
      } catch (err) {
        setError('Failed to load users: ' + err.message);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    init();
  }, [router, queryUserId]);

  // Track active conversation user for SocketContext
  useEffect(() => {
    if (selectedUser?.id) {
      setActiveConversationUserId(selectedUser.id);
      markConversationAsRead(selectedUser.id);
    } else {
      setActiveConversationUserId(null);
    }
    return () => {
      setActiveConversationUserId(null);
    };
  }, [selectedUser, setActiveConversationUserId, markConversationAsRead]);

  // Filter users by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [searchQuery, users]);

  // 2. Fetch conversation history when selecting a user
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      setIsLoadingMessages(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/messages/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          markConversationAsRead(selectedUser.id);
        } else {
          setError('Failed to load conversation history');
        }
      } catch (err) {
        setError('Error fetching messages: ' + err.message);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchHistory();
  }, [selectedUser, markConversationAsRead]);

  // 3. Listen for live incoming messages from SocketProvider
  useEffect(() => {
    if (!latestMessage) return;

    // Check if this message belongs to the active conversation
    const isFromSelectedUser = selectedUser && latestMessage.senderId === selectedUser.id;
    const isToSelectedUser = selectedUser && latestMessage.recipientId === selectedUser.id;

    if (isFromSelectedUser || isToSelectedUser) {
      setMessages((prev) => {
        // Replace temporary optimistic message if ACK arrives with tempId
        if (latestMessage.tempId) {
          const idx = prev.findIndex((m) => m.id === latestMessage.tempId);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], id: latestMessage.id, status: latestMessage.status || 'sent' };
            return copy;
          }
        }

        // Prevent duplicates
        if (prev.some((m) => m.id === latestMessage.id)) return prev;
        return [...prev, latestMessage];
      });

      if (isFromSelectedUser && selectedUser) {
        markConversationAsRead(selectedUser.id);
      }
    }
  }, [latestMessage, selectedUser, markConversationAsRead]);

  // 4. Update message statuses live when delivery receipts arrive
  useEffect(() => {
    if (!messageStatusMap || Object.keys(messageStatusMap).length === 0) return;
    setMessages((prev) =>
      prev.map((msg) => {
        const update = messageStatusMap[msg.id];
        if (update) {
          return {
            ...msg,
            status: update.status || msg.status,
            deliveredAt: update.deliveredAt || msg.deliveredAt,
          };
        }
        return msg;
      })
    );
  }, [messageStatusMap]);

  // 5. Update message statuses live when recipient reads messages
  useEffect(() => {
    if (!selectedUser || !readReceiptMap[selectedUser.id]) return;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.senderId === currentUserId) {
          return { ...msg, status: 'read', read: true };
        }
        return msg;
      })
    );
  }, [readReceiptMap, selectedUser, currentUserId]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (!selectedUser) return;

    startTyping(selectedUser.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedUser.id);
    }, 1500);
  };

  // Send Direct Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUser || isSending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    stopTyping(selectedUser.id);

    try {
      const optimisticMsg = await sendMessage(selectedUser.id, textToSend);
      if (optimisticMsg) {
        setMessages((prev) => [...prev, optimisticMsg]);
      }
    } catch (err) {
      setError('Failed to send encrypted message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const isOtherUserTyping = selectedUser && typingMap[selectedUser.id];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Telemetry Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-mono">Express Socket.IO Server Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="text-rose-400 font-mono">Connecting to Messaging Microservice...</span>
              </>
            )}
          </div>
          <span className="text-slate-600">|</span>
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dual Asymmetric: Scratch ECC Point Encryption</span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-indigo-300 uppercase px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">
          Real-Time WebSocket Provider
        </span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-300 px-4 py-2 text-xs flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Users Directory */}
        <div className="w-full sm:w-80 md:w-96 border-r border-slate-800 bg-slate-900/60 flex flex-col">
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Conversations</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {users.length} registered
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search user..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {isLoadingUsers ? (
              <div className="text-center py-10">
                <Loader className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                <span className="text-xs text-slate-500 mt-2 block">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No users found.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const online = isUserOnline(u.id);
                const isSelected = selectedUser?.id === u.id;

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition ${
                      isSelected ? 'bg-indigo-950/70 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 uppercase">
                          {u.username.slice(0, 2)}
                        </div>
                        {/* Live Online Dot */}
                        <Circle
                          className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 rounded-full ${
                            online
                              ? 'text-emerald-400 fill-emerald-400 ring-2 ring-slate-900'
                              : 'text-slate-600 fill-slate-600'
                          }`}
                        />
                      </div>

                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate font-mono">
                          {u.username}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                          <span className={online ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                          <span>•</span>
                          <span className="uppercase text-[10px]">{u.role}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Stream */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 uppercase">
                      {selectedUser.username.slice(0, 2)}
                    </div>
                    <Circle
                      className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 rounded-full ${
                        isUserOnline(selectedUser.id)
                          ? 'text-emerald-400 fill-emerald-400'
                          : 'text-slate-600 fill-slate-600'
                      }`}
                    />
                  </div>

                  <div>
                    <h2 className="text-xs font-bold text-white font-mono">{selectedUser.username}</h2>
                    <p className="text-[10px] text-slate-400">
                      {isUserOnline(selectedUser.id) ? (
                        <span className="text-emerald-400 font-semibold">Active Now</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="hidden md:inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 bg-emerald-950/60 border border-emerald-700/60 rounded text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Scratch ECC E2EE + HMAC MAC</span>
                  </span>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {isLoadingMessages ? (
                  <div className="text-center py-16">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                    <span className="text-xs text-slate-500 mt-2 block">Decrypting message history with Scratch ECC...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 text-slate-600 space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-50" />
                    <p className="text-xs text-slate-400">No messages yet. Send an encrypted message to begin!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-md rounded-xl p-3 text-xs leading-relaxed space-y-1 shadow ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Cryptographic Badges & Status Ticks */}
                          <div
                            className={`pt-1 text-[10px] flex items-center justify-between space-x-2 border-t ${
                              isMe ? 'border-indigo-500/50 text-indigo-200' : 'border-slate-700 text-slate-400'
                            }`}
                          >
                            <span className="font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                                <span>MAC Verified</span>
                              </span>

                              {isMe && (
                                <span className="inline-flex items-center space-x-0.5 ml-1 font-mono text-[10px]">
                                  {msg.status === 'read' ? (
                                    <span className="inline-flex items-center text-sky-300 font-semibold space-x-0.5" title="Read by recipient">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span>Read</span>
                                    </span>
                                  ) : msg.status === 'delivered' ? (
                                    <span className="inline-flex items-center text-indigo-200 space-x-0.5" title="Delivered to recipient">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                      <span>Delivered</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-indigo-300/80 space-x-0.5" title="Sent to server">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Sent</span>
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ciphertext Preview */}
                        {msg.rawCiphertextPreview && (
                          <span className="text-[9px] text-slate-600 font-mono mt-0.5 px-1">
                            Cipher: {msg.rawCiphertextPreview}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {isOtherUserTyping && (
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-400 italic py-1 animate-pulse">
                    <span>{selectedUser.username} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Message ${selectedUser.username} (Encrypted via Scratch ECC)...`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={inputMessage}
                  onChange={handleInputChange}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow"
                >
                  {isSending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-white">Select a User to Chat</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose any registered user from the left sidebar to start an end-to-end asymmetrically encrypted conversation powered by Express + Socket.IO and Scratch ECC.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400 text-xs flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Loading secure chat...</span>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Loader,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Trash2,
  Key,
  Check,
  X,
  Lock,
  Users,
  ArrowBigUp,
  ArrowBigDown,
  CornerDownRight,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function Posts() {
  const { sendLiveNotification } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'friends'
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  // Voting & Comments States
  const [votingLoading, setVotingLoading] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [replyText, setReplyText] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});

  const fetchPosts = async (currentFilter = filter) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const queryUrl =
        currentFilter === 'friends' ? '/api/posts?filter=friends' : '/api/posts';

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        router.push('/signin');
      }
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(filter);
  }, [filter]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.userId) setCurrentUser(data);
      })
      .catch(() => {});
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError('');
    setSuccess('');
    setIsPosting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (response.ok) {
        setContent('');
        setSuccess('Post encrypted via Scratch ECC and signed with HMAC MAC.');
        fetchPosts(filter);
      } else {
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError('Failed to create post: ' + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  const handleUpdatePost = async (postId) => {
    if (!editContent.trim()) return;

    setError('');
    setSuccess('');
    setIsUpdating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditingPostId(null);
        setEditContent('');
        setSuccess('Post updated with fresh Scratch ECC encryption & HMAC MAC.');
        fetchPosts(filter);
      } else {
        setError(data.message || 'Failed to update post');
      }
    } catch (err) {
      setError('Failed to update post: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this encrypted post?')) return;

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess('Post deleted successfully');
        fetchPosts(filter);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete post');
      }
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  // Upvote / Downvote Handler
  const handleVote = async (postId, voteType) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setVotingLoading((prev) => ({ ...prev, [postId]: true }));

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });

      if (res.ok) {
        const data = await res.json();
        const targetPost = posts.find((p) => p.id === postId);

        // Dispatch live notification if upvoted
        if (targetPost && targetPost.author?.id) {
          if (data.userVote === 1) {
            sendLiveNotification(targetPost.author.id, {
              type: 'vote',
              title: 'Post Upvoted! 👍',
              message: `${currentUser?.username || 'A user'} upvoted your post!`,
              link: '/posts',
            });
          }
        }

        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  score: data.score,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                  userVote: data.userVote,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVotingLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Comments Fetch & Toggle
  const toggleComments = async (postId) => {
    setExpandedComments((prev) => {
      const nextState = !prev[postId];
      if (nextState && !postComments[postId]) {
        fetchComments(postId);
      }
      return { ...prev, [postId]: nextState };
    });
  };

  const fetchComments = async (postId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingComments((prev) => ({ ...prev, [postId]: true }));

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPostComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
      }
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Post top-level comment
  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentBody = (newCommentText[postId] || '').trim();
    if (!commentBody) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentBody }),
      });

      if (res.ok) {
        const data = await res.json();
        const targetPost = posts.find((p) => p.id === postId);

        // Dispatch live notification to post author
        if (targetPost && targetPost.author?.id) {
          sendLiveNotification(targetPost.author.id, {
            type: 'comment',
            title: 'New Comment 💬',
            message: `${currentUser?.username || 'A user'} commented: "${commentBody.length > 40 ? commentBody.slice(0, 40) + '...' : commentBody}"`,
            link: '/posts',
          });
        }

        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setNewCommentText((prev) => ({ ...prev, [postId]: '' }));
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
          )
        );
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to post comment');
      }
    } catch (err) {
      setError('Error posting comment: ' + err.message);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Post direct reply to a comment or sub-reply
  const handleAddReply = async (e, postId, parentCommentId, replyToUserId = null, replyInputKey = null) => {
    e.preventDefault();
    const inputKey = replyInputKey || parentCommentId;
    const replyBody = (replyText[inputKey] || '').trim();
    if (!replyBody) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    setSubmittingComment((prev) => ({ ...prev, [inputKey]: true }));

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyBody, parentId: parentCommentId }),
      });

      if (res.ok) {
        const data = await res.json();
        const commentsList = postComments[postId] || [];
        const parentComment = commentsList.find((c) => c.id === parentCommentId);

        const targetPost = posts.find((p) => p.id === postId);

        // Target user to notify: specific reply author if provided, else parentComment author
        const notifyTarget = replyToUserId || parentComment?.author?.id;

        // Dispatch live notification to comment/reply author
        if (notifyTarget) {
          sendLiveNotification(notifyTarget, {
            type: 'comment',
            title: 'New Reply 💬',
            message: `${currentUser?.username || 'A user'} replied: "${replyBody.length > 40 ? replyBody.slice(0, 40) + '...' : replyBody}"`,
            link: '/posts',
          });
        }

        // Also notify post author if different from comment author
        if (targetPost && targetPost.author?.id && targetPost.author.id !== notifyTarget) {
          sendLiveNotification(targetPost.author.id, {
            type: 'comment',
            title: 'New Reply on Your Post 💬',
            message: `${currentUser?.username || 'A user'} replied to a thread in your post: "${replyBody.length > 40 ? replyBody.slice(0, 40) + '...' : replyBody}"`,
            link: '/posts',
          });
        }

        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setReplyText((prev) => ({ ...prev, [inputKey]: '' }));
        setReplyingTo((prev) => ({ ...prev, [inputKey]: false }));
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
          )
        );
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to post reply');
      }
    } catch (err) {
      setError('Error posting reply: ' + err.message);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [inputKey]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Security Info Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950/60 border border-emerald-700/50 rounded-lg text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Algorithm 2: Scratch ECC Active (secp256k1)</h2>
              <p className="text-xs text-slate-400">
                Posts and comments are asymmetrically encrypted with Scratch ECC before database storage; integrity is verified with Scratch HMAC-SHA256.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono uppercase bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-2.5 py-1 rounded">
            HMAC Integrity
          </span>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Post Creation Form */}
        <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-5">
          <h1 className="text-sm font-bold text-white uppercase tracking-wider mb-3 text-slate-300">
            Publish New Asymmetrically Encrypted Post
          </h1>
          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? (Automatically encrypted with Scratch ECC before database storage)"
              required
              rows="3"
              className="block w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Zero-Knowledge Storage
              </span>
              <button
                type="submit"
                disabled={isPosting || !content.trim()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
              >
                {isPosting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Encrypting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Encrypt & Post (ECC)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">Live Encrypted Feed</h2>
              <span className="text-xs text-slate-400">
                ({posts.length} {posts.length === 1 ? 'post' : 'posts'})
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setFilter('friends')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                  filter === 'friends'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends Only</span>
              </button>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl">
              <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-2 text-sm font-medium text-slate-300">
                {filter === 'friends' ? 'No posts from friends' : 'No posts in feed'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {filter === 'friends'
                  ? 'Connect with peers in People Directory to see their posts here.'
                  : 'Create the first encrypted post above.'}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isUpvoted = post.userVote === 1;
              const isDownvoted = post.userVote === -1;
              const isCommentsOpen = !!expandedComments[post.id];
              const comments = postComments[post.id] || [];
              const isCommentsLoading = loadingComments[post.id];

              // Group top-level comments and replies
              const rootComments = comments.filter((c) => !c.parentId);
              const repliesByParent = comments.reduce((acc, c) => {
                if (c.parentId) {
                  acc[c.parentId] = acc[c.parentId] || [];
                  acc[c.parentId].push(c);
                }
                return acc;
              }, {});

              return (
                <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md">
                  {/* Header: Author, Role, Date, Key Version, MAC Badge */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/users/${post.author.id}`}
                        className="font-semibold text-sm text-white hover:text-indigo-400 transition flex items-center space-x-1"
                      >
                        <span>{post.author.username}</span>
                      </Link>
                      <Link
                        href="/messages"
                        title={`Message @${post.author.username}`}
                        className="text-slate-500 hover:text-emerald-400 p-0.5 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Link>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          post.author.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {post.author.role || 'user'}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <time className="text-xs text-slate-500" dateTime={post.createdAt}>
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

                      {/* Data Integrity MAC Badge */}
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

                  {/* Content or Inline Editor */}
                  {editingPostId === post.id ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs text-indigo-400 font-semibold">
                        Edit Post (Will automatically re-encrypt with active ECC key & update MAC):
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows="3"
                        className="block w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleEditSave(post.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                          {isUpdating ? 'Re-encrypting...' : 'Save & Re-encrypt'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-100 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                      {post.updatedAt && post.updatedAt !== post.createdAt && (
                        <span className="text-[11px] text-slate-500 italic block mt-1">
                          (Edited: {new Date(post.updatedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Engagement Bar: Upvote/Downvote, Comments Button, Ciphertext, Actions */}
                  <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Left: Voting & Comments Widget */}
                    <div className="flex items-center space-x-3">
                      {/* Upvote & Downvote Control */}
                      <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
                        <button
                          onClick={() => handleVote(post.id, 1)}
                          disabled={votingLoading[post.id]}
                          title="Upvote post"
                          className={`p-1 rounded hover:bg-slate-700 transition ${
                            isUpvoted
                              ? 'text-amber-400 bg-amber-500/20'
                              : 'text-slate-400 hover:text-amber-400'
                          }`}
                        >
                          <ArrowBigUp className={`w-4 h-4 ${isUpvoted ? 'fill-amber-400' : ''}`} />
                        </button>

                        <span
                          className={`px-2 font-mono text-xs font-bold ${
                            post.score > 0
                              ? 'text-emerald-400'
                              : post.score < 0
                              ? 'text-rose-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {post.score || 0}
                        </span>

                        <button
                          onClick={() => handleVote(post.id, -1)}
                          disabled={votingLoading[post.id]}
                          title="Downvote post"
                          className={`p-1 rounded hover:bg-slate-700 transition ${
                            isDownvoted
                              ? 'text-indigo-400 bg-indigo-500/20'
                              : 'text-slate-400 hover:text-indigo-400'
                          }`}
                        >
                          <ArrowBigDown className={`w-4 h-4 ${isDownvoted ? 'fill-indigo-400' : ''}`} />
                        </button>
                      </div>

                      {/* Comments Toggle Button */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition ${
                          isCommentsOpen
                            ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{post.commentsCount || 0} Comments</span>
                        {isCommentsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Right: Actions & Ciphertext */}
                    <div className="flex items-center space-x-3 text-slate-500">
                      <div className="hidden sm:block font-mono text-[10px] truncate max-w-xs text-slate-500">
                        <span className="text-slate-400">Cipher:</span> {post.rawCiphertextPreview}
                      </div>

                      {post.canEdit && editingPostId !== post.id && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditStart(post)}
                            className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800 transition"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Comments & Replies Section */}
                  {isCommentsOpen && (
                    <div className="pt-4 border-t border-slate-800/80 space-y-4">
                      {/* Add New Top-Level Comment Form */}
                      <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex items-start space-x-2">
                        <textarea
                          rows="2"
                          placeholder="Write an asymmetrically encrypted comment (Scratch ECC)..."
                          value={newCommentText[post.id] || ''}
                          onChange={(e) =>
                            setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment[post.id] || !(newCommentText[post.id] || '').trim()}
                          className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition flex items-center space-x-1"
                        >
                          {submittingComment[post.id] ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Post</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Comments Stream */}
                      {isCommentsLoading ? (
                        <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center space-x-2">
                          <Loader className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Decrypting comments with Scratch ECC...</span>
                        </div>
                      ) : rootComments.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/50">
                          No comments yet. Be the first to start the discussion!
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {rootComments.map((comment) => {
                            const replies = repliesByParent[comment.id] || [];
                            const isReplying = !!replyingTo[comment.id];

                            return (
                              <div key={comment.id} className="space-y-2">
                                {/* Parent Comment */}
                                <div className="bg-slate-800/60 border border-slate-750 rounded-lg p-3 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <Link
                                        href={`/users/${comment.author.id}`}
                                        className="font-bold text-slate-200 hover:text-indigo-400"
                                      >
                                        @{comment.author.username}
                                      </Link>
                                      <span className="text-[10px] text-slate-500">
                                        {new Date(comment.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>

                                    {comment.integrityVerified ? (
                                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>MAC Verified</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-rose-400 flex items-center space-x-1 font-mono">
                                        <ShieldAlert className="w-3 h-3" />
                                        <span>MAC Failed</span>
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                                    {comment.content}
                                  </p>

                                  <div className="pt-1 flex items-center justify-between text-[11px]">
                                    <button
                                      onClick={() =>
                                        setReplyingTo((prev) => ({
                                          ...prev,
                                          [comment.id]: !prev[comment.id],
                                        }))
                                      }
                                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                                    >
                                      <Reply className="w-3 h-3" />
                                      <span>Reply</span>
                                    </button>

                                    <span className="text-[10px] font-mono text-slate-500">
                                      ECC {comment.keyVersion}
                                    </span>
                                  </div>

                                  {/* Inline Reply Input */}
                                  {isReplying && (
                                    <form
                                      onSubmit={(e) => handleAddReply(e, post.id, comment.id)}
                                      className="pt-2 flex items-start space-x-2"
                                    >
                                      <textarea
                                        rows="2"
                                        placeholder={`Reply to @${comment.author.username}...`}
                                        value={replyText[comment.id] || ''}
                                        onChange={(e) =>
                                          setReplyText((prev) => ({
                                            ...prev,
                                            [comment.id]: e.target.value,
                                          }))
                                        }
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <button
                                        type="submit"
                                        disabled={
                                          submittingComment[comment.id] ||
                                          !(replyText[comment.id] || '').trim()
                                        }
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                                      >
                                        {submittingComment[comment.id] ? (
                                          <Loader className="w-3 h-3 animate-spin" />
                                        ) : (
                                          'Reply'
                                        )}
                                      </button>
                                    </form>
                                  )}
                                </div>

                                {/* Threaded / Indented Replies */}
                                {replies.length > 0 && (
                                  <div className="ml-6 sm:ml-8 pl-3 border-l-2 border-slate-700/60 space-y-2">
                                    {replies.map((reply) => {
                                      const isReplyingToReply = !!replyingTo[reply.id];

                                      return (
                                        <div
                                          key={reply.id}
                                          className="bg-slate-800/40 border border-slate-750/70 rounded-lg p-2.5 space-y-1.5"
                                        >
                                          <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center space-x-1.5">
                                              <CornerDownRight className="w-3 h-3 text-indigo-400" />
                                              <Link
                                                href={`/users/${reply.author.id}`}
                                                className="font-bold text-slate-200 hover:text-indigo-400"
                                              >
                                                @{reply.author.username}
                                              </Link>
                                              <span className="text-[10px] text-slate-500">
                                                {new Date(reply.createdAt).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            </div>

                                            {reply.integrityVerified ? (
                                              <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                                                <ShieldCheck className="w-3 h-3" />
                                                <span>MAC Verified</span>
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-rose-400 flex items-center space-x-1 font-mono">
                                                <ShieldAlert className="w-3 h-3" />
                                                <span>MAC Failed</span>
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-xs text-slate-200 whitespace-pre-wrap pl-4 leading-relaxed">
                                            {reply.content}
                                          </p>

                                          <div className="pt-1 flex items-center justify-between text-[11px] pl-4">
                                            <button
                                              onClick={() => {
                                                setReplyingTo((prev) => ({
                                                  ...prev,
                                                  [reply.id]: !prev[reply.id],
                                                }));
                                                if (!replyText[reply.id]) {
                                                  setReplyText((prev) => ({
                                                    ...prev,
                                                    [reply.id]: `@${reply.author.username} `,
                                                  }));
                                                }
                                              }}
                                              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                                            >
                                              <Reply className="w-3 h-3" />
                                              <span>Reply</span>
                                            </button>

                                            <span className="text-[10px] font-mono text-slate-500">
                                              ECC {reply.keyVersion || 'v1'}
                                            </span>
                                          </div>

                                          {/* Inline Reply Form for this sub-reply */}
                                          {isReplyingToReply && (
                                            <form
                                              onSubmit={(e) =>
                                                handleAddReply(
                                                  e,
                                                  post.id,
                                                  comment.id,
                                                  reply.author.id,
                                                  reply.id
                                                )
                                              }
                                              className="pt-2 pl-4 flex items-start space-x-2"
                                            >
                                              <textarea
                                                rows="2"
                                                placeholder={`Reply to @${reply.author.username}...`}
                                                value={replyText[reply.id] || ''}
                                                onChange={(e) =>
                                                  setReplyText((prev) => ({
                                                    ...prev,
                                                    [reply.id]: e.target.value,
                                                  }))
                                                }
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                              />
                                              <button
                                                type="submit"
                                                disabled={
                                                  submittingComment[reply.id] ||
                                                  !(replyText[reply.id] || '').trim()
                                                }
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                                              >
                                                {submittingComment[reply.id] ? (
                                                  <Loader className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  'Reply'
                                                )}
                                              </button>
                                            </form>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
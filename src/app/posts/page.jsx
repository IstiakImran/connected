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
} from 'lucide-react';

export default function Posts() {
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
        fetchPosts();
      } else {
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleEditStart = (post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleEditSave = async (postId) => {
    if (!editContent.trim()) return;
    setIsUpdating(true);
    setError('');
    setSuccess('');

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
        setSuccess('Post updated, re-encrypted with Scratch ECC, and re-signed with new MAC.');
        fetchPosts();
      } else {
        setError(data.message || 'Failed to edit post');
      }
    } catch (err) {
      setError('Failed to edit post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess('Post deleted successfully.');
        fetchPosts();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete post');
      }
    } catch (err) {
      setError('Failed to delete post');
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
                Posts are asymmetrically encrypted with scratch ECC before database storage; integrity is verified using Scratch HMAC-SHA256.
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
              <span className="text-xs text-slate-500 font-mono">
                Payload auto-signed with HMAC MAC
              </span>
              <button
                type="submit"
                disabled={isPosting || !content.trim()}
                className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition shadow"
              >
                {isPosting ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Encrypting & Posting...
                  </>
                ) : (
                  <>
                    <Send className="-ml-1 mr-2 h-4 w-4" />
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
            posts.map((post) => (
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

                {/* Footer: Database Ciphertext Preview and Edit/Delete Actions */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="font-mono text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                    <span className="text-slate-400">Ciphertext:</span> {post.rawCiphertextPreview}
                  </div>

                  {post.canEdit && editingPostId !== post.id && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditStart(post)}
                        className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader, MessageSquare } from 'lucide-react';

export default function Posts() {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const router = useRouter();

    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/signin');
                return;
            }

            const response = await fetch('/api/posts', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts);
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
        fetchPosts();
    }, []);

    const handlePost = async (e) => {
        e.preventDefault();
        setError('');
        setIsPosting(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/signin');
                return;
            }

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
                fetchPosts();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setIsPosting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                        <h1 className="text-lg leading-6 font-medium text-gray-900">Your Posts</h1>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handlePost} className="space-y-4">
                            <div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    required
                                    rows="3"
                                    className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isPosting || !content.trim()}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPosting ? (
                                        <>
                                            <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                            Posting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="-ml-1 mr-2 h-4 w-4" />
                                            Post
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 space-y-6">
                            {posts.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first post.</p>
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <div key={post.id} className="bg-gray-50 rounded-lg p-6">
                                        <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                            <span className="font-medium">{post.author.username}</span>
                                            <time dateTime={post.createdAt}>
                                                {new Date(post.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </time>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
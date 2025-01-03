// /app/components/Navbar.js
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Home, User, MessageSquare, LogOut } from 'lucide-react';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/signin');
    };

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const isActive = (path) => pathname === path;

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link
                                href="/"
                                className="text-xl font-bold text-indigo-600"
                            >
                                YourApp
                            </Link>
                        </div>

                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/')
                                    ? 'border-indigo-500 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                <Home className="h-4 w-4 mr-2" />
                                Home
                            </Link>

                            {token && (
                                <>
                                    <Link
                                        href="/profile"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/profile')
                                            ? 'border-indigo-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            }`}
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Profile
                                    </Link>

                                    <Link
                                        href="/posts"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/posts')
                                            ? 'border-indigo-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            }`}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Posts
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center">
                        {token ? (
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </button>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/signup"
                                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                                >
                                    Sign up
                                </Link>
                                <Link
                                    href="/signin"
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Sign in
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

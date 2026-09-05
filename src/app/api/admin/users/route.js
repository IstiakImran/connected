// /app/api/admin/users/route.js
// Admin RBAC User Management & System Audit Log

import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken, decryptUserField } from '@/lib/auth';
import { User } from '@/schema/User';
import { Post } from '@/schema/Posts';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    if (session.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden: Admin privileges required." }, { status: 403 });
    }

    await dbConnect();

    const users = await User.find().sort({ createdAt: -1 });
    const postCount = await Post.countDocuments();

    const userList = await Promise.all(
      users.map(async (u) => {
        let username = 'User';
        let email = 'Email';
        try {
          username = await decryptUserField(u.username);
          email = await decryptUserField(u.email);
        } catch (e) {
          username = '[Encrypted]';
          email = '[Encrypted]';
        }

        return {
          id: u._id,
          username,
          email,
          role: u.role || 'user',
          twoFactorEnabled: u.twoFactorEnabled,
          createdAt: u.createdAt,
        };
      })
    );

    return NextResponse.json({
      totalUsers: users.length,
      totalPosts: postCount,
      users: userList,
    });
  } catch (error) {
    console.error("Admin Users Fetch Error:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch admin users" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    if (session.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden: Admin privileges required." }, { status: 403 });
    }

    const { userId, newRole } = await req.json();
    if (!userId || !['user', 'admin'].includes(newRole)) {
      return NextResponse.json({ message: "Invalid user ID or role." }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    user.role = newRole;
    await user.save();

    return NextResponse.json({ message: `Role successfully updated to ${newRole}.` });
  } catch (error) {
    console.error("Admin Role Change Error:", error);
    return NextResponse.json({ message: error.message || "Failed to update user role" }, { status: 500 });
  }
}

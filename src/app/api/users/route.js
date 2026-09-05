// /app/api/users/route.js
// List registered users for 1-on-1 direct messaging

import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken, decryptUserField } from '@/lib/auth';
import { User } from '@/schema/User';
import { Connection } from '@/schema/Connection';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    await dbConnect();

    const currentUserId = session.id;

    // Fetch connections involving current user
    const userConnections = await Connection.find({
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    });

    const connMap = new Map();
    for (const c of userConnections) {
      const otherId =
        c.requester.toString() === currentUserId
          ? c.recipient.toString()
          : c.requester.toString();

      if (c.status === 'accepted') {
        connMap.set(otherId, { status: 'accepted', connectionId: c._id.toString() });
      } else if (c.status === 'pending') {
        connMap.set(otherId, {
          status: c.requester.toString() === currentUserId ? 'pending_sent' : 'pending_received',
          connectionId: c._id.toString(),
        });
      }
    }

    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      '_id username role createdAt'
    );

    const decryptedUsers = await Promise.all(
      users.map(async (u) => {
        let username = 'User';
        try {
          username = await decryptUserField(u.username);
        } catch (e) {
          username = '[Encrypted]';
        }

        const relation = connMap.get(u._id.toString()) || { status: 'none', connectionId: null };

        return {
          id: u._id.toString(),
          username,
          role: u.role || 'user',
          createdAt: u.createdAt,
          connectionStatus: relation.status,
          connectionId: relation.connectionId,
        };
      })
    );

    return NextResponse.json({ users: decryptedUsers });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json({ message: error.message || "Failed to load users" }, { status: 500 });
  }
}

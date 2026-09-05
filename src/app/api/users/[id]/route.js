// /src/app/api/users/[id]/route.js
import { dbConnect } from '@/lib/dbConnect';
import {
  verifySessionToken,
  decryptUserField,
  decryptPostContent,
  verifyPayloadIntegrity,
} from '@/lib/auth';
import { User } from '@/schema/User';
import { Post } from '@/schema/Posts';
import { Connection } from '@/schema/Connection';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Decrypt target user public identity (Scratch RSA)
    let username = 'User';
    let fullName = 'User';
    try {
      username = await decryptUserField(targetUser.username);
    } catch (e) {
      username = '[Encrypted]';
    }
    try {
      fullName = await decryptUserField(targetUser.fullName);
    } catch (e) {
      fullName = '[Encrypted]';
    }

    // Check relationship / connection status
    let connectionStatus = 'none';
    let connectionId = null;

    if (targetUserId === session.id) {
      connectionStatus = 'self';
    } else {
      const conn = await Connection.findOne({
        $or: [
          { requester: session.id, recipient: targetUserId },
          { requester: targetUserId, recipient: session.id },
        ],
      });

      if (conn) {
        connectionId = conn._id.toString();
        if (conn.status === 'accepted') {
          connectionStatus = 'accepted';
        } else if (conn.status === 'pending') {
          connectionStatus =
            conn.requester.toString() === session.id ? 'pending_sent' : 'pending_received';
        }
      }
    }

    // Fetch posts specifically created by this target user
    const posts = await Post.find({ author: targetUserId }).sort({ createdAt: -1 });

    const decryptedPosts = await Promise.all(
      posts.map(async (post) => {
        // HMAC integrity verification
        const integrityPayload = `${post.content}:${targetUserId}:${new Date(
          post.createdAt
        ).toISOString()}`;
        const isIntegrityValid = verifyPayloadIntegrity(integrityPayload, post.mac);

        // Decrypt post content using Scratch ECC (Algorithm 2)
        let decryptedContent = '[Decryption Failed]';
        try {
          decryptedContent = await decryptPostContent(post.content, post.keyVersion || 'v1');
        } catch (e) {
          decryptedContent = '[Decryption error: Corrupt ciphertext]';
        }

        return {
          id: post._id.toString(),
          content: decryptedContent,
          keyVersion: post.keyVersion || 'v1',
          mac: post.mac,
          integrityVerified: isIntegrityValid,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      })
    );

    return NextResponse.json({
      user: {
        id: targetUser._id.toString(),
        username,
        fullName,
        role: targetUser.role || 'user',
        createdAt: targetUser.createdAt,
      },
      connectionStatus,
      connectionId,
      posts: decryptedPosts,
      totalPosts: decryptedPosts.length,
    });
  } catch (error) {
    console.error('User profile fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

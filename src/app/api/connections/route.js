// /src/app/api/connections/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken, decryptUserField } from '@/lib/auth';
import { Connection } from '@/schema/Connection';
import { User } from '@/schema/User';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    await dbConnect();

    const currentUserId = session.id;

    // Fetch all connections involving the current user
    const connections = await Connection.find({
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    })
      .populate('requester', '_id username role createdAt')
      .populate('recipient', '_id username role createdAt')
      .sort({ updatedAt: -1 });

    const friends = [];
    const incomingRequests = [];
    const outgoingRequests = [];

    for (const conn of connections) {
      if (!conn.requester || !conn.recipient) continue;

      const isRequester = conn.requester._id.toString() === currentUserId;
      const otherUser = isRequester ? conn.recipient : conn.requester;

      let decryptedUsername = 'User';
      try {
        decryptedUsername = await decryptUserField(otherUser.username);
      } catch (e) {
        decryptedUsername = '[Encrypted]';
      }

      const formattedUser = {
        connectionId: conn._id.toString(),
        userId: otherUser._id.toString(),
        username: decryptedUsername,
        role: otherUser.role || 'user',
        createdAt: otherUser.createdAt,
        connectedAt: conn.updatedAt,
      };

      if (conn.status === 'accepted') {
        friends.push(formattedUser);
      } else if (conn.status === 'pending') {
        if (isRequester) {
          outgoingRequests.push({
            requestId: conn._id.toString(),
            targetUser: formattedUser,
            createdAt: conn.createdAt,
          });
        } else {
          incomingRequests.push({
            requestId: conn._id.toString(),
            sender: formattedUser,
            createdAt: conn.createdAt,
          });
        }
      }
    }

    return NextResponse.json({
      friends,
      incomingRequests,
      outgoingRequests,
      pendingCount: incomingRequests.length,
    });
  } catch (error) {
    console.error('Connections GET error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { targetUserId, action } = await req.json();

    if (!targetUserId || !action) {
      return NextResponse.json(
        { message: 'targetUserId and action are required.' },
        { status: 400 }
      );
    }

    const currentUserId = session.id;

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { message: 'You cannot connect with yourself.' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ message: 'Target user not found.' }, { status: 404 });
    }

    // Check existing connection
    const existing = await Connection.findOne({
      $or: [
        { requester: currentUserId, recipient: targetUserId },
        { requester: targetUserId, recipient: currentUserId },
      ],
    });

    if (action === 'send') {
      if (existing) {
        if (existing.status === 'accepted') {
          return NextResponse.json(
            { message: 'You are already connected with this user.' },
            { status: 400 }
          );
        }
        if (existing.status === 'pending') {
          if (existing.requester.toString() === currentUserId) {
            return NextResponse.json(
              { message: 'Friend request already sent.' },
              { status: 400 }
            );
          } else {
            // Auto-accept if target already sent a request
            existing.status = 'accepted';
            await existing.save();
            return NextResponse.json({
              message: 'Friend request accepted! You are now connected.',
              status: 'accepted',
            });
          }
        }
        // If rejected, allow resending
        existing.requester = currentUserId;
        existing.recipient = targetUserId;
        existing.status = 'pending';
        await existing.save();
        return NextResponse.json({
          message: 'Friend request sent successfully.',
          status: 'pending',
        });
      }

      await Connection.create({
        requester: currentUserId,
        recipient: targetUserId,
        status: 'pending',
      });

      return NextResponse.json(
        { message: 'Friend request sent successfully.', status: 'pending' },
        { status: 201 }
      );
    }

    if (action === 'accept') {
      if (!existing || existing.recipient.toString() !== currentUserId) {
        return NextResponse.json(
          { message: 'No pending request found to accept.' },
          { status: 404 }
        );
      }
      existing.status = 'accepted';
      await existing.save();
      return NextResponse.json({
        message: 'Friend request accepted.',
        status: 'accepted',
      });
    }

    if (action === 'reject') {
      if (!existing || existing.recipient.toString() !== currentUserId) {
        return NextResponse.json(
          { message: 'No pending request found to decline.' },
          { status: 404 }
        );
      }
      await Connection.deleteOne({ _id: existing._id });
      return NextResponse.json({
        message: 'Friend request declined.',
        status: 'none',
      });
    }

    if (action === 'cancel') {
      if (!existing || existing.requester.toString() !== currentUserId) {
        return NextResponse.json(
          { message: 'No outgoing request found to cancel.' },
          { status: 404 }
        );
      }
      await Connection.deleteOne({ _id: existing._id });
      return NextResponse.json({
        message: 'Friend request cancelled.',
        status: 'none',
      });
    }

    if (action === 'remove') {
      if (!existing) {
        return NextResponse.json(
          { message: 'No connection found to remove.' },
          { status: 404 }
        );
      }
      await Connection.deleteOne({ _id: existing._id });
      return NextResponse.json({
        message: 'Connection removed.',
        status: 'none',
      });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Connections POST error:', error);
    return NextResponse.json(
      { message: error.message || 'Connection action failed.' },
      { status: 500 }
    );
  }
}

// /src/app/api/connections/status/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken } from '@/lib/auth';
import { Connection } from '@/schema/Connection';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      return NextResponse.json({ message: 'targetUserId is required' }, { status: 400 });
    }

    if (targetUserId === session.id) {
      return NextResponse.json({ status: 'self' });
    }

    await dbConnect();

    const conn = await Connection.findOne({
      $or: [
        { requester: session.id, recipient: targetUserId },
        { requester: targetUserId, recipient: session.id },
      ],
    });

    if (!conn) {
      return NextResponse.json({ status: 'none' });
    }

    if (conn.status === 'accepted') {
      return NextResponse.json({ status: 'accepted', connectionId: conn._id });
    }

    if (conn.status === 'pending') {
      if (conn.requester.toString() === session.id) {
        return NextResponse.json({ status: 'pending_sent', connectionId: conn._id });
      } else {
        return NextResponse.json({ status: 'pending_received', connectionId: conn._id });
      }
    }

    return NextResponse.json({ status: 'none' });
  } catch (error) {
    console.error('Connection status error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to check connection status' },
      { status: 500 }
    );
  }
}

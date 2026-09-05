// /src/app/api/messages/read/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken } from '@/lib/auth';
import { DirectMessage } from '@/schema/DirectMessage';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { senderId } = await req.json();

    if (!senderId) {
      return NextResponse.json({ message: 'Sender ID required' }, { status: 400 });
    }

    await dbConnect();

    const now = new Date();
    const result = await DirectMessage.updateMany(
      { sender: senderId, recipient: session.id, read: false },
      {
        $set: {
          read: true,
          status: 'read',
          readAt: now,
        },
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      readAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json({ message: error.message || 'Failed to mark messages as read' }, { status: 500 });
  }
}

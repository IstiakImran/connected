// /src/app/api/notifications/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken } from '@/lib/auth';
import { Notification } from '@/schema/Notification';
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

    const notifications = await Notification.find({ recipient: session.id })
      .populate('sender', 'username role')
      .sort({ createdAt: -1 })
      .limit(40);

    const unreadCount = await Notification.countDocuments({
      recipient: session.id,
      read: false,
    });

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt,
      sender: n.sender
        ? {
            id: n.sender._id.toString(),
            role: n.sender.role,
          }
        : null,
    }));

    return NextResponse.json({ notifications: formatted, unreadCount });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return NextResponse.json({ message: 'Failed to fetch notifications' }, { status: 500 });
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
    const body = await req.json();
    const { recipientId, type, title, message, link } = body;

    if (!recipientId || !title || !message) {
      return NextResponse.json({ message: 'Missing required notification fields' }, { status: 400 });
    }

    await dbConnect();

    const doc = await Notification.create({
      recipient: recipientId,
      sender: session.id,
      type: type || 'system',
      title,
      message,
      link: link || '',
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: doc._id.toString(),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        link: doc.link,
        read: doc.read,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('Create notification error:', err);
    return NextResponse.json({ message: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PUT(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id, all } = await req.json();

    await dbConnect();

    if (all) {
      await Notification.updateMany(
        { recipient: session.id, read: false },
        { $set: { read: true } }
      );
    } else if (id) {
      await Notification.updateOne(
        { _id: id, recipient: session.id },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update notification error:', err);
    return NextResponse.json({ message: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id, all } = await req.json();

    await dbConnect();

    if (all) {
      await Notification.deleteMany({ recipient: session.id });
    } else if (id) {
      await Notification.deleteOne({ _id: id, recipient: session.id });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    return NextResponse.json({ message: 'Failed to delete notification' }, { status: 500 });
  }
}

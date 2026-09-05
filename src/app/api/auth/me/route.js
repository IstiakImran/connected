// /app/api/auth/me/route.js
import { verifySessionToken } from '@/lib/auth';
import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/schema/User';
import { decryptUserField } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    await dbConnect();

    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const username = await decryptUserField(user.username);

    return NextResponse.json({
      authenticated: true,
      userId: user._id.toString(),
      role: user.role || 'user',
      username,
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}

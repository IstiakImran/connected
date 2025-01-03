// /app/api/profile/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifyJWT, decryptData } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { User } from '@/schema/User';

export async function GET(req) {
  const token = req.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = verifyJWT(token);
    await dbConnect();

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Decrypt user data
    const decryptedUsername = decryptData(user.username);
    const decryptedEmail = decryptData(user.email);
    const decryptedFullName = decryptData(user.fullName || '');
    const decryptedAddress = decryptData(user.address || '');

    return NextResponse.json({
      username: decryptedUsername,
      email: decryptedEmail,
      fullName: decryptedFullName,
      address: decryptedAddress,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}

// /app/api/auth/verify-2fa/route.js
// Step 2 of Two-Step Authentication (2FA) & Anti-Hijacking Token Generation

import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/schema/User';
import { generateSessionToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { message: 'User ID and 2FA verification code are required.' },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { message: 'User account not found.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (!user.twoFactorExpires || new Date() > user.twoFactorExpires) {
      return NextResponse.json(
        { message: '2FA code has expired. Please sign in again.' },
        { status: 400 }
      );
    }

    // Check code
    if (user.twoFactorTempCode !== code.trim()) {
      return NextResponse.json(
        { message: 'Invalid 2FA verification code.' },
        { status: 400 }
      );
    }

    // 2FA Verified: Invalidate one-time challenge
    user.twoFactorTempCode = null;
    user.twoFactorExpires = null;
    await user.save();

    // Generate Anti-Hijacking Session Token bound to Client Fingerprint
    const token = generateSessionToken(user, request);

    return NextResponse.json(
      {
        message: 'Two-step authentication verified successfully.',
        token,
        role: user.role,
        userId: user._id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('2FA Verification Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: ' + error.message },
      { status: 500 }
    );
  }
}

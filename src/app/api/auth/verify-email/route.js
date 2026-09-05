// /app/api/auth/verify-email/route.js
// Email Verification Route using Nodemailer

import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/schema/User';
import { sendVerificationEmail } from '@/lib/mailer';
import { decryptUserField } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, code, resend } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    // Handle Resend Request
    if (resend) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailVerificationCode = newCode;
      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await user.save();

      const decryptedEmail = await decryptUserField(user.email);
      const decryptedUsername = await decryptUserField(user.username);
      const mailResult = await sendVerificationEmail(decryptedEmail, decryptedUsername, newCode);

      if (!mailResult.success) {
        return NextResponse.json(
          { message: 'Failed to resend verification email: ' + mailResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'A new verification code has been dispatched to your email address.',
      });
    }

    if (!code) {
      return NextResponse.json({ message: 'Verification code is required.' }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email is already verified.' }, { status: 200 });
    }

    if (!user.emailVerificationExpires || new Date() > user.emailVerificationExpires) {
      return NextResponse.json({ message: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    if (user.emailVerificationCode !== code.trim()) {
      return NextResponse.json({ message: 'Invalid email verification code.' }, { status: 400 });
    }

    // Verification successful
    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    return NextResponse.json({
      message: 'Email address verified successfully! You can now sign in.',
      emailVerified: true,
    });
  } catch (error) {
    console.error('Email Verification Error:', error);
    return NextResponse.json({ message: 'Server error: ' + error.message }, { status: 500 });
  }
}

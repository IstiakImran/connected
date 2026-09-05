// /app/api/auth/login/route.js
// Step 1 of Two-Step Authentication (2FA) with Real Email OTP Dispatch via Nodemailer

import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/schema/User';
import { comparePassword, hashForBlindIndex, decryptUserField } from '@/lib/auth';
import { sendTwoFactorEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email/Username and password are required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    const searchHash = hashForBlindIndex(email);
    const user = await User.findOne({
      $or: [{ emailHash: searchHash }, { usernameHash: searchHash }],
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 400 }
      );
    }

    // Verify password with scratch salted hash
    const isMatch = await comparePassword(password, user.password, user.salt);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 400 }
      );
    }

    // Check if Email Verification is completed
    if (user.emailVerified === false) {
      return NextResponse.json(
        {
          requireEmailVerification: true,
          userId: user._id.toString(),
          message: 'Please verify your email address before signing in.',
        },
        { status: 403 }
      );
    }

    // Step 1 Passed: Generate 2FA One-Time Verification Challenge
    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorTempCode = twoFactorCode;
    user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await user.save();

    // Decrypt user email to send actual 2FA email via Nodemailer
    const decryptedEmail = await decryptUserField(user.email);
    const decryptedUsername = await decryptUserField(user.username);
    const mailResult = await sendTwoFactorEmail(decryptedEmail, decryptedUsername, twoFactorCode);

    if (!mailResult.success) {
      console.error('2FA dispatch failed during login:', mailResult.error);
      return NextResponse.json(
        { message: 'Failed to send 2FA OTP code to email: ' + mailResult.error },
        { status: 500 }
      );
    }

    // Mask email for privacy (e.g. is***@gmail.com)
    const atIndex = decryptedEmail.indexOf('@');
    const maskedEmail = atIndex > 2
      ? decryptedEmail.slice(0, 2) + '*'.repeat(atIndex - 2) + decryptedEmail.slice(atIndex)
      : decryptedEmail;

    return NextResponse.json(
      {
        require2FA: true,
        userId: user._id.toString(),
        maskedEmail,
        message: `Primary credentials verified. A 6-digit OTP code has been sent to your email (${maskedEmail}).`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login Step 1 Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error: ' + error.message },
      { status: 500 }
    );
  }
}

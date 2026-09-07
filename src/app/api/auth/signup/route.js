// /app/api/auth/signup/route.js

import { dbConnect } from '@/lib/dbConnect';
import { hashPassword, encryptUserField, hashForBlindIndex } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';
import { User } from '@/schema/User';

export async function POST(request) {
  try {
    const { username, email, password, fullName, address } = await request.json();

    if (!username || !email || !password || !fullName || !address) {
      return NextResponse.json(
        { message: 'All fields (username, email, password, fullName, address) are required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Compute search hashes for unique check without storing plaintext
    const emailHash = hashForBlindIndex(email);
    const usernameHash = hashForBlindIndex(username);

    const existingUser = await User.findOne({
      $or: [{ emailHash }, { usernameHash }],
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this email or username already exists.' },
        { status: 400 }
      );
    }

    // From-scratch salted password hashing
    const { hash: hashedPassword, salt } = await hashPassword(password);

    // Asymmetric encryption of user identity fields using Scratch RSA
    const encryptedUsername = await encryptUserField(username);
    const encryptedEmail = await encryptUserField(email);
    const encryptedFullName = await encryptUserField(fullName);
    const encryptedAddress = await encryptUserField(address);

    // Enforce user role: self-registration must never grant administrative privileges
    const assignedRole = 'user';

    // Generate 6-digit email verification code for Nodemailer
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await User.create({
      username: encryptedUsername,
      usernameHash,
      email: encryptedEmail,
      emailHash,
      password: hashedPassword,
      salt,
      fullName: encryptedFullName,
      address: encryptedAddress,
      role: assignedRole,
      twoFactorEnabled: true,
      emailVerified: false,
      emailVerificationCode,
      emailVerificationExpires,
    });

    // Send verification email via Nodemailer
    const mailResult = await sendVerificationEmail(email, username, emailVerificationCode);

    if (!mailResult.success) {
      console.error('Email dispatch failed during signup:', mailResult.error);
      return NextResponse.json(
        { message: 'Failed to send verification email: ' + mailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'User registered successfully. A 6-digit verification code has been sent to your email address.',
        userId: user._id,
        requireEmailVerification: true,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error during registration: ' + error.message },
      { status: 500 }
    );
  }
}

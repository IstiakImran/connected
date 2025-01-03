// /app/api/auth/login/route.js

import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/schema/User';
import { comparePassword, generateJWT, encryptData } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Encrypt the email to match the stored encrypted email in the database
    const encryptedEmail = encryptData(email);

    // Find user by encrypted email
    const user = await User.findOne({ email: encryptedEmail });
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 400 }
      );
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials.' },
        { status: 400 }
      );
    }

    // Generate JWT
    const token = generateJWT(user);

    return NextResponse.json(
      { token },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error.' },
      { status: 500 }
    );
  }
}

// /app/api/profile/route.js
// Profile View & Update with Scratch RSA Asymmetric Encryption & Decryption

import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken, decryptUserField, encryptUserField, hashForBlindIndex } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { User } from '@/schema/User';

export async function GET(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    await dbConnect();

    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Decrypt user data using Scratch RSA
    const decryptedUsername = await decryptUserField(user.username);
    const decryptedEmail = await decryptUserField(user.email);
    const decryptedFullName = await decryptUserField(user.fullName || '');
    const decryptedAddress = await decryptUserField(user.address || '');

    return NextResponse.json({
      id: user._id,
      username: decryptedUsername,
      email: decryptedEmail,
      fullName: decryptedFullName,
      address: decryptedAddress,
      role: user.role || 'user',
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      encryptionAlgorithm: 'Scratch RSA (Dual Asymmetric: Algorithm 1)',
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    return NextResponse.json({ message: error.message || 'Invalid or expired session' }, { status: 401 });
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
    const { fullName, address } = await req.json();

    if (!fullName || !address) {
      return NextResponse.json({ message: 'Full name and address are required.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Re-encrypt updated fields using Scratch RSA with active key version
    user.fullName = await encryptUserField(fullName);
    user.address = await encryptUserField(address);
    user.updatedAt = new Date();

    await user.save();

    return NextResponse.json({
      message: 'Profile updated and re-encrypted successfully with Scratch RSA.',
      profile: {
        fullName,
        address,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

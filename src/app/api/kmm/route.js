// /app/api/kmm/route.js
// Key Management Module API: Key Distribution & RBAC-Protected Key Rotation

import { verifySessionToken } from '@/lib/auth';
import { getPublicKeysForDistribution, rotateKeys, getRotationHistory } from '@/lib/crypto/kmm';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    let isAdmin = false;
    if (token) {
      try {
        const session = verifySessionToken(token, req);
        isAdmin = session.role === 'admin';
      } catch (e) {
        // Continue as anonymous/public
      }
    }

    const publicKeys = await getPublicKeysForDistribution();
    let rotationHistory = [];

    if (isAdmin) {
      rotationHistory = await getRotationHistory();
    }

    return NextResponse.json({
      publicKeys,
      isAdmin,
      rotationHistory: isAdmin ? rotationHistory : undefined,
    });
  } catch (error) {
    console.error("KMM GET Error:", error);
    return NextResponse.json({ message: "Failed to fetch key management telemetry: " + error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);

    // RBAC check: Only System Administrators can trigger Key Rotation
    if (session.role !== 'admin') {
      return NextResponse.json(
        { message: "Forbidden: Role-Based Access Control requires 'admin' privilege to rotate cryptographic keys." },
        { status: 403 }
      );
    }

    const result = await rotateKeys();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Key Rotation Error:", error);
    return NextResponse.json({ message: error.message || "Key rotation failed" }, { status: 500 });
  }
}

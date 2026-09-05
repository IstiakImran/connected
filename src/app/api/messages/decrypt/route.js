// /app/api/messages/decrypt/route.js
// Decrypts an incoming real-time socket message using Scratch ECC and verifies Scratch HMAC

import { verifySessionToken, decryptPostContent, verifyPayloadIntegrity } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    verifySessionToken(token, req);
    const { content, keyVersion, mac, senderId, createdAt } = await req.json();

    if (!content) {
      return NextResponse.json({ message: "Content is required." }, { status: 400 });
    }

    const decryptedText = await decryptPostContent(content, keyVersion || 'v1');

    let isIntegrityValid = false;
    if (mac && senderId && createdAt) {
      const integrityPayload = `${content}:${senderId}:${new Date(createdAt).toISOString()}`;
      isIntegrityValid = verifyPayloadIntegrity(integrityPayload, mac);
    }

    return NextResponse.json({
      decryptedContent: decryptedText,
      integrityVerified: isIntegrityValid,
    });
  } catch (error) {
    console.error("Message Decrypt Error:", error);
    return NextResponse.json({ message: error.message || "Decryption failed" }, { status: 500 });
  }
}

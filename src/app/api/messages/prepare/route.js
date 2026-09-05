// /app/api/messages/prepare/route.js
// Asymmetrically encrypts a message with Scratch ECC and signs with Scratch HMAC before socket transmission

import { verifySessionToken, encryptPostContent, signPayload } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { recipientId, content } = await req.json();

    if (!recipientId || !content || !content.trim()) {
      return NextResponse.json({ message: "Recipient and content are required." }, { status: 400 });
    }

    // Asymmetrically encrypt message using Scratch ECC (Algorithm 2)
    const { ciphertext, version } = await encryptPostContent(content.trim());

    // Sign payload with Scratch HMAC
    const createdAt = new Date();
    const integrityPayload = `${ciphertext}:${session.id}:${createdAt.toISOString()}`;
    const mac = signPayload(integrityPayload);

    return NextResponse.json({
      encryptedContent: ciphertext,
      mac,
      keyVersion: version,
      senderId: session.id,
      recipientId,
      createdAt,
    });
  } catch (error) {
    console.error("Message Prepare Error:", error);
    return NextResponse.json({ message: error.message || "Encryption failed" }, { status: 500 });
  }
}

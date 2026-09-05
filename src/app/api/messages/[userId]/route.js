// /app/api/messages/[userId]/route.js
// Fetch and decrypt conversation history using Scratch ECC and verify Scratch HMAC MAC

import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken, decryptPostContent, verifyPayloadIntegrity } from '@/lib/auth';
import { DirectMessage } from '@/schema/DirectMessage';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { userId: otherUserId } = await params;

    await dbConnect();

    const messages = await DirectMessage.find({
      $or: [
        { sender: session.id, recipient: otherUserId },
        { sender: otherUserId, recipient: session.id },
      ],
    }).sort({ createdAt: 1 });

    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => {
        let decryptedText = '[Decryption Failed]';
        try {
          decryptedText = await decryptPostContent(msg.content, msg.keyVersion || 'v1');
        } catch (e) {
          decryptedText = '[Corrupt Ciphertext]';
        }

        const integrityPayload = `${msg.content}:${msg.sender.toString()}:${new Date(msg.createdAt).toISOString()}`;
        const isIntegrityValid = verifyPayloadIntegrity(integrityPayload, msg.mac);

        return {
          id: msg._id.toString(),
          senderId: msg.sender.toString(),
          recipientId: msg.recipient.toString(),
          content: decryptedText,
          rawCiphertextPreview: msg.content.slice(0, 30) + '...',
          mac: msg.mac,
          keyVersion: msg.keyVersion || 'v1',
          integrityVerified: isIntegrityValid,
          createdAt: msg.createdAt,
        };
      })
    );

    return NextResponse.json({ messages: decryptedMessages });
  } catch (error) {
    console.error("Messages Fetch Error:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch messages" }, { status: 500 });
  }
}

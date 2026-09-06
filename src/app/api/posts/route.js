// /app/api/posts/route.js
// Asymmetric ECC Posts Management with HMAC Data Integrity Verification

import { dbConnect } from "@/lib/dbConnect";
import {
  verifySessionToken,
  encryptPostContent,
  decryptPostContent,
  decryptUserField,
  signPayload,
  verifyPayloadIntegrity,
} from "@/lib/auth";
import { NextResponse } from "next/server";
import { Post } from "@/schema/Posts";
import { User } from "@/schema/User";
import { Connection } from "@/schema/Connection";
import { Comment } from "@/schema/Comment";

export async function GET(req) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    await dbConnect();

    let query = {};

    if (filter === "friends") {
      const connections = await Connection.find({
        $or: [{ requester: session.id }, { recipient: session.id }],
        status: "accepted",
      });

      const friendIds = connections.map((c) =>
        c.requester.toString() === session.id ? c.recipient : c.requester
      );

      query = { author: { $in: [session.id, ...friendIds] } };
    }

    // Fetch posts according to filter, ordered newest first
    const posts = await Post.find(query).populate("author").sort({ createdAt: -1 });

    const decryptedPosts = await Promise.all(
      posts.map(async (post) => {
        if (!post.author) {
          return null;
        }

        const authorId = post.author._id ? post.author._id.toString() : post.author.toString();

        // Verify Data Integrity using Scratch HMAC
        let isIntegrityValid = false;
        if (post.mac) {
          if (verifyPayloadIntegrity(`${post.content}:${authorId}`, post.mac)) {
            isIntegrityValid = true;
          } else if (post.createdAt && verifyPayloadIntegrity(`${post.content}:${authorId}:${new Date(post.createdAt).toISOString()}`, post.mac)) {
            isIntegrityValid = true;
          } else if (post.updatedAt && verifyPayloadIntegrity(`${post.content}:${authorId}:${new Date(post.updatedAt).toISOString()}`, post.mac)) {
            isIntegrityValid = true;
          } else if (verifyPayloadIntegrity(post.content, post.mac)) {
            isIntegrityValid = true;
          }
        }

        // Decrypt post content using Scratch ECC (Algorithm 2)
        let decryptedContent = '[Decryption Failed]';
        try {
          decryptedContent = await decryptPostContent(post.content, post.keyVersion || 'v1');
        } catch (e) {
          console.error(`Decryption error for post ${post._id}:`, e);
          decryptedContent = '[Decryption error: Corrupt ciphertext]';
        }

        // Decrypt author username using Scratch RSA (Algorithm 1)
        let authorUsername = 'Anonymous';
        try {
          authorUsername = await decryptUserField(post.author.username);
        } catch (e) {
          authorUsername = 'User';
        }

        const isAuthor = String(authorId) === String(session.id);
        const isAdmin = session.role === 'admin';
        const canEdit = Boolean(isAuthor || isAdmin);

        // Voting & comments metrics
        const votes = post.votes || [];
        const upvotes = votes.filter((v) => v.voteType === 1).length;
        const downvotes = votes.filter((v) => v.voteType === -1).length;
        const score = upvotes - downvotes;
        const userVoteObj = votes.find((v) => v.user && v.user.toString() === session.id);
        const userVote = userVoteObj ? userVoteObj.voteType : 0;

        const commentsCount = await Comment.countDocuments({ post: post._id });

        return {
          id: post._id,
          content: decryptedContent,
          rawCiphertextPreview: post.content.slice(0, 35) + '...',
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          keyVersion: post.keyVersion || 'v1',
          mac: post.mac,
          integrityVerified: isIntegrityValid,
          canEdit,
          score,
          upvotes,
          downvotes,
          userVote,
          commentsCount,
          author: {
            id: post.author._id.toString(),
            username: authorUsername,
            role: post.author.role,
          },
        };
      })
    );

    return NextResponse.json({
      posts: decryptedPosts.filter(Boolean),
      cryptoDetails: {
        postAlgorithm: 'Scratch ECC (secp256k1 ElGamal)',
        identityAlgorithm: 'Scratch RSA',
        integrityAlgorithm: 'Scratch HMAC-SHA256',
      },
    });
  } catch (error) {
    console.error("Fetch Posts Error:", error);
    return NextResponse.json({ message: error.message || "Invalid token" }, { status: 401 });
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
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ message: "Content is required." }, { status: 400 });
    }

    await dbConnect();

    // Encrypt post content with Scratch ECC (Algorithm 2)
    const { ciphertext, version } = await encryptPostContent(content.trim());

    const createdAt = new Date();
    // Compute Message Authentication Code (MAC) on (ciphertext + authorId)
    const integrityPayload = `${ciphertext}:${session.id}`;
    const mac = signPayload(integrityPayload);

    const post = await Post.create({
      author: session.id,
      content: ciphertext,
      keyVersion: version,
      mac,
      createdAt,
      updatedAt: createdAt,
    });

    return NextResponse.json(
      {
        message: "Post created and encrypted with Scratch ECC successfully.",
        postId: post._id,
        keyVersion: version,
        mac,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Post Error:", error);
    return NextResponse.json({ message: error.message || "Failed to create post" }, { status: 500 });
  }
}

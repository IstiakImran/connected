// /src/app/api/posts/[id]/comments/route.js
import { dbConnect } from '@/lib/dbConnect';
import {
  verifySessionToken,
  encryptPostContent,
  decryptPostContent,
  decryptUserField,
  signPayload,
  verifyPayloadIntegrity,
} from '@/lib/auth';
import { Post } from '@/schema/Posts';
import { Comment } from '@/schema/Comment';
import { User } from '@/schema/User';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id: postId } = await params;

    await dbConnect();

    const comments = await Comment.find({ post: postId })
      .populate('author', '_id username role')
      .sort({ createdAt: 1 });

    const decryptedComments = await Promise.all(
      comments.map(async (c) => {
        if (!c.author) return null;

        // Verify Data Integrity using Scratch HMAC
        const integrityPayload = `${c.content}:${c.author._id.toString()}:${new Date(
          c.createdAt
        ).toISOString()}`;
        const isIntegrityValid = verifyPayloadIntegrity(integrityPayload, c.mac);

        // Decrypt comment using Scratch ECC (Algorithm 2)
        let decryptedContent = '[Decryption Failed]';
        try {
          decryptedContent = await decryptPostContent(c.content, c.keyVersion || 'v1');
        } catch (e) {
          decryptedContent = '[Decryption Error]';
        }

        // Decrypt author username using Scratch RSA (Algorithm 1)
        let authorUsername = 'User';
        try {
          authorUsername = await decryptUserField(c.author.username);
        } catch (e) {
          authorUsername = '[Encrypted]';
        }

        return {
          id: c._id.toString(),
          postId: c.post.toString(),
          parentId: c.parentId ? c.parentId.toString() : null,
          content: decryptedContent,
          author: {
            id: c.author._id.toString(),
            username: authorUsername,
            role: c.author.role || 'user',
          },
          keyVersion: c.keyVersion || 'v1',
          mac: c.mac,
          integrityVerified: isIntegrityValid,
          createdAt: c.createdAt,
          isAuthor: c.author._id.toString() === session.id,
        };
      })
    );

    return NextResponse.json({
      comments: decryptedComments.filter(Boolean),
    });
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to load comments.' },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id: postId } = await params;
    const { content, parentId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ message: 'Comment content is required.' }, { status: 400 });
    }

    await dbConnect();

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    // Verify parent comment if this is a nested reply
    let validParentId = null;
    if (parentId) {
      const parentComment = await Comment.findOne({ _id: parentId, post: postId });
      if (parentComment) {
        validParentId = parentComment._id;
      }
    }

    // Asymmetrically encrypt comment with Scratch ECC (Algorithm 2)
    const { ciphertext, version } = await encryptPostContent(content.trim());

    // Sign with Scratch HMAC-SHA256
    const createdAt = new Date();
    const integrityPayload = `${ciphertext}:${session.id}:${createdAt.toISOString()}`;
    const mac = signPayload(integrityPayload);

    const newComment = await Comment.create({
      post: postId,
      author: session.id,
      parentId: validParentId,
      content: ciphertext,
      keyVersion: version,
      mac,
      createdAt,
    });

    // Decrypt author's username for immediate client UI display
    const authorUser = await User.findById(session.id);
    let authorUsername = 'User';
    try {
      authorUsername = await decryptUserField(authorUser.username);
    } catch (e) {
      authorUsername = 'User';
    }

    return NextResponse.json(
      {
        message: validParentId ? 'Reply posted successfully.' : 'Comment posted successfully.',
        comment: {
          id: newComment._id.toString(),
          postId,
          parentId: validParentId ? validParentId.toString() : null,
          content: content.trim(),
          author: {
            id: session.id,
            username: authorUsername,
            role: session.role || 'user',
          },
          keyVersion: version,
          mac,
          integrityVerified: true,
          createdAt,
          isAuthor: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Comment creation error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to post comment.' },
      { status: 500 }
    );
  }
}

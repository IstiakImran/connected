// /src/app/api/posts/[id]/vote/route.js
import { dbConnect } from '@/lib/dbConnect';
import { verifySessionToken } from '@/lib/auth';
import { Post } from '@/schema/Posts';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id: postId } = await params;
    const { voteType } = await req.json();

    if (![1, -1].includes(voteType)) {
      return NextResponse.json(
        { message: 'voteType must be 1 (upvote) or -1 (downvote).' },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    if (!post.votes) {
      post.votes = [];
    }

    const existingVoteIndex = post.votes.findIndex(
      (v) => v.user.toString() === session.id
    );

    let newUserVote = 0;

    if (existingVoteIndex > -1) {
      const existingVote = post.votes[existingVoteIndex];
      if (existingVote.voteType === voteType) {
        // Toggle vote off
        post.votes.splice(existingVoteIndex, 1);
        newUserVote = 0;
      } else {
        // Change vote (e.g. from downvote to upvote)
        existingVote.voteType = voteType;
        existingVote.createdAt = new Date();
        newUserVote = voteType;
      }
    } else {
      // New vote
      post.votes.push({
        user: session.id,
        voteType,
        createdAt: new Date(),
      });
      newUserVote = voteType;
    }

    await post.save();

    const upvotes = post.votes.filter((v) => v.voteType === 1).length;
    const downvotes = post.votes.filter((v) => v.voteType === -1).length;
    const score = upvotes - downvotes;

    return NextResponse.json({
      success: true,
      score,
      upvotes,
      downvotes,
      userVote: newUserVote,
    });
  } catch (error) {
    console.error('Post vote error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to process vote.' },
      { status: 500 }
    );
  }
}

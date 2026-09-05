// /app/api/posts/[id]/route.js
// Post Edit and Delete routes with automatic ECC re-encryption and MAC signature update

import { dbConnect } from "@/lib/dbConnect";
import {
  verifySessionToken,
  encryptPostContent,
  signPayload,
} from "@/lib/auth";
import { NextResponse } from "next/server";
import { Post } from "@/schema/Posts";

export async function PUT(req, { params }) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ message: "Content cannot be empty." }, { status: 400 });
    }

    await dbConnect();
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json({ message: "Post not found." }, { status: 404 });
    }

    // Check RBAC permission: Author or Admin can edit
    const isAuthor = post.author.toString() === session.id;
    const isAdmin = session.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: "Forbidden: You cannot edit another user's post." }, { status: 403 });
    }

    // Re-encrypt updated content with Scratch ECC using active key version
    const { ciphertext, version } = await encryptPostContent(content.trim());
    const updatedAt = new Date();

    // Re-compute Message Authentication Code (MAC) for data integrity
    const integrityPayload = `${ciphertext}:${post.author.toString()}:${updatedAt.toISOString()}`;
    const newMac = signPayload(integrityPayload);

    post.content = ciphertext;
    post.keyVersion = version;
    post.mac = newMac;
    post.updatedAt = updatedAt;
    await post.save();

    return NextResponse.json({
      message: "Post successfully edited, re-encrypted with Scratch ECC, and signed with new MAC.",
      keyVersion: version,
      updatedAt,
    });
  } catch (error) {
    console.error("Edit Post Error:", error);
    return NextResponse.json({ message: error.message || "Failed to edit post" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token, req);
    const { id } = await params;

    await dbConnect();
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json({ message: "Post not found." }, { status: 404 });
    }

    const isAuthor = post.author.toString() === session.id;
    const isAdmin = session.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: "Forbidden: You cannot delete another user's post." }, { status: 403 });
    }

    await Post.findByIdAndDelete(id);

    return NextResponse.json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return NextResponse.json({ message: error.message || "Failed to delete post" }, { status: 500 });
  }
}

// /app/api/posts/route.js
import { dbConnect } from "@/lib/dbConnect";

import { verifyJWT, encryptData, decryptData } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Post } from "@/schema/Posts";

export async function GET(req) {
  const token = req.headers.get("Authorization")?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = verifyJWT(token);
    await dbConnect();

    const posts = await Post.find({ author: decoded.id }).populate("author");

    // Decrypt post content and author info
    const decryptedPosts = posts.map((post) => ({
      id: post._id,
      content: decryptData(post.content),
      createdAt: post.createdAt,
      author: {
        id: post.author._id,
        username: decryptData(post.author.username),
      },
    }));

    return NextResponse.json({ posts: decryptedPosts });
  } catch (error) {
    console.error("Fetch Posts Error:", error);
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
}

export async function POST(req) {
  const token = req.headers.get("Authorization")?.split(" ")[1];
  const { content } = await req.json();

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!content) {
    return NextResponse.json(
      { message: "Content is required." },
      { status: 400 }
    );
  }

  try {
    const decoded = verifyJWT(token);
    await dbConnect();

    // Encrypt post content
    const encryptedContent = encryptData(content);

    const post = await Post.create({
      author: decoded.id,
      content: encryptedContent,
    });

    return NextResponse.json(
      { message: "Post created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Post Error:", error);
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
}

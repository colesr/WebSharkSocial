import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/posts - Returns the authenticated user's feed (own posts + followed users)
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor"); // ISO timestamp for pagination
  const limit = 20;

  const rows = await db.all<{
      id: number;
      content: string;
      image_url: string;
      created_at: string;
      author_id: number;
      author_username: string;
      author_display_name: string;
      author_avatar: string;
      like_count: number;
      comment_count: number;
      liked_by_me: number;
    }>(
      `SELECT
         p.id, p.content, p.image_url, p.created_at,
         u.id AS author_id, u.username AS author_username,
         u.display_name AS author_display_name, u.avatar_url AS author_avatar,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)              AS like_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)           AS comment_count,
         EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE (p.user_id = ? OR p.user_id IN (
                SELECT following_id FROM follows WHERE follower_id = ?
              ))
         AND (? IS NULL OR p.created_at < ?)
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [me.userId, me.userId, me.userId, cursor, cursor, limit]
    );

  const posts = rows.map((r) => ({
    id: r.id,
    content: r.content,
    imageUrl: r.image_url,
    createdAt: r.created_at,
    author: {
      id: r.author_id,
      username: r.author_username,
      displayName: r.author_display_name,
      avatarUrl: r.author_avatar,
    },
    likeCount: r.like_count,
    commentCount: r.comment_count,
    likedByMe: r.liked_by_me === 1,
  }));

  const nextCursor =
    posts.length === limit ? posts[posts.length - 1].createdAt : null;

  return NextResponse.json({ posts, nextCursor });
}

// POST /api/posts - Create a new post
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, imageUrl } = await req.json();

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 500) {
    return NextResponse.json(
      { error: "Content must be 500 characters or fewer" },
      { status: 400 }
    );
  }

  const result = await db.run(
    "INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)",
    [me.userId, content.trim(), imageUrl ?? ""]
  );

  const post = await db.get<{
      id: number;
      content: string;
      image_url: string;
      created_at: string;
      author_id: number;
      author_username: string;
      author_display_name: string;
      author_avatar: string;
    }>(
      `SELECT p.id, p.content, p.image_url, p.created_at,
             u.id AS author_id, u.username AS author_username,
             u.display_name AS author_display_name, u.avatar_url AS author_avatar
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [Number(result.lastInsertRowid)]
    );

  if (!post) {
    return NextResponse.json({ error: "Post not found after creation" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: post.id,
      content: post.content,
      imageUrl: post.image_url,
      createdAt: post.created_at,
      author: {
       id: post.author_id,
       username: post.author_username,
       displayName: post.author_display_name,
       avatarUrl: post.author_avatar,
      },
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    },
    { status: 201 }
  );
}

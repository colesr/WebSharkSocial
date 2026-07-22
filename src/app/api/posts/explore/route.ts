import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/posts/explore - Returns recent posts from all users
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
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
       WHERE (? IS NULL OR p.created_at < ?)
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [me?.userId ?? null, cursor, cursor, limit]
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

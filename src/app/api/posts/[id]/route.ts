import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  const { id } = await params;
  const postId = Number(id);

  const row = await db.get<
    | {
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
      }
    | undefined
  >(
      `SELECT
         p.id, p.content, p.image_url, p.created_at,
         u.id AS author_id, u.username AS author_username,
         u.display_name AS author_display_name, u.avatar_url AS author_avatar,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)              AS like_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)           AS comment_count,
         EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [me?.userId ?? null, postId]
    );

  if (!row) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username,
      displayName: row.author_display_name,
      avatarUrl: row.author_avatar,
    },
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: row.liked_by_me === 1,
  });
}

// DELETE /api/posts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  const post = await db.get<{ user_id: number }>(
    "SELECT user_id FROM posts WHERE id = ?",
    [postId]
  );

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.user_id !== me.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.run("DELETE FROM posts WHERE id = ?", [postId]);
  return NextResponse.json({ success: true });
}

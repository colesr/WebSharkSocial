import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/posts/[id]/like
export async function POST(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  db.prepare(
    "INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)"
  ).run(me.userId, postId);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
    .get(postId) as { count: number };

  return NextResponse.json({ likeCount: count, likedByMe: true });
}

// DELETE /api/posts/[id]/like
export async function DELETE(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  db.prepare(
    "DELETE FROM likes WHERE user_id = ? AND post_id = ?"
  ).run(me.userId, postId);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
    .get(postId) as { count: number };

  return NextResponse.json({ likeCount: count, likedByMe: false });
}

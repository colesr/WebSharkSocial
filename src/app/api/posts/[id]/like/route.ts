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

  const post = await db.get<{ id: number }>("SELECT id FROM posts WHERE id = ?", [postId]);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await db.run("INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)", [
    me.userId,
    postId,
  ]);

  const likeRow = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
    [postId]
  );

  return NextResponse.json({ likeCount: likeRow?.count ?? 0, likedByMe: true });
}

// DELETE /api/posts/[id]/like
export async function DELETE(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  await db.run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [
    me.userId,
    postId,
  ]);

  const likeRow = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
    [postId]
  );

  return NextResponse.json({ likeCount: likeRow?.count ?? 0, likedByMe: false });
}

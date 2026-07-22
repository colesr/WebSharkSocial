import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ username: string }> };

// POST /api/users/[username]/follow
export async function POST(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;

  const target = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === me.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [
    me.userId,
    target.id,
  ]);

  const followerRow = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM follows WHERE following_id = ?",
    [target.id]
  );

  return NextResponse.json({
    followerCount: followerRow?.count ?? 0,
    isFollowing: true,
  });
}

// DELETE /api/users/[username]/follow
export async function DELETE(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;

  const target = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
    me.userId,
    target.id,
  ]);

  const followerRow = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM follows WHERE following_id = ?",
    [target.id]
  );

  return NextResponse.json({
    followerCount: followerRow?.count ?? 0,
    isFollowing: false,
  });
}

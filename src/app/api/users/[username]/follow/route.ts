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

  const target = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username) as { id: number } | undefined;

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === me.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  db.prepare(
    "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)"
  ).run(me.userId, target.id);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE following_id = ?")
    .get(target.id) as { count: number };

  return NextResponse.json({ followerCount: count, isFollowing: true });
}

// DELETE /api/users/[username]/follow
export async function DELETE(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;

  const target = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username) as { id: number } | undefined;

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  db.prepare(
    "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
  ).run(me.userId, target.id);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE following_id = ?")
    .get(target.id) as { count: number };

  return NextResponse.json({ followerCount: count, isFollowing: false });
}

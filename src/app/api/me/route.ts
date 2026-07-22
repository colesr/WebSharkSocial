import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = db
    .prepare(
      "SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?"
    )
    .get(me.userId) as
    | {
        id: number;
        username: string;
        display_name: string;
        email: string;
        bio: string;
        avatar_url: string;
        created_at: string;
      }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  });
}

export async function PUT(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName, bio, avatarUrl } = await req.json();

  if (displayName !== undefined && (typeof displayName !== "string" || displayName.trim().length === 0)) {
    return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
  }

  db.prepare(
    "UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url) WHERE id = ?"
  ).run(
    displayName ?? null,
    bio ?? null,
    avatarUrl ?? null,
    me.userId
  );

  const updated = db
    .prepare("SELECT id, username, display_name, bio, avatar_url FROM users WHERE id = ?")
    .get(me.userId) as {
      id: number;
      username: string;
      display_name: string;
      bio: string;
      avatar_url: string;
    };

  return NextResponse.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.display_name,
    bio: updated.bio,
    avatarUrl: updated.avatar_url,
  });
}

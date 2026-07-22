import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/users/search?q=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `%${q}%`;

  const users = db
    .prepare(
      `SELECT id, username, display_name, bio, avatar_url
       FROM users
       WHERE username LIKE ? OR display_name LIKE ?
       ORDER BY username ASC
       LIMIT 20`
    )
    .all(pattern, pattern) as Array<{
      id: number;
      username: string;
      display_name: string;
      bio: string;
      avatar_url: string;
    }>;

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      bio: u.bio,
      avatarUrl: u.avatar_url,
    })),
  });
}

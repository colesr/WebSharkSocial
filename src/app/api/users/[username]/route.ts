import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ username: string }> };

// GET /api/users/[username]
export async function GET(_req: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  const { username } = await params;

  const user = db
    .prepare(
      `SELECT id, username, display_name, bio, avatar_url, created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS follower_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id  = users.id) AS following_count,
              (SELECT COUNT(*) FROM posts    WHERE user_id     = users.id) AS post_count
       FROM users WHERE username = ?`
    )
    .get(username) as
    | {
        id: number;
        username: string;
        display_name: string;
        bio: string;
        avatar_url: string;
        created_at: string;
        follower_count: number;
        following_count: number;
        post_count: number;
      }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isFollowing = me
    ? !!db
        .prepare(
          "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?"
        )
        .get(me.userId, user.id)
    : false;

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    followerCount: user.follower_count,
    followingCount: user.following_count,
    postCount: user.post_count,
    isFollowing,
  });
}

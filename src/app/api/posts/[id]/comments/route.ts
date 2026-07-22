import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id]/comments
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const postId = Number(id);

  const rows = await db.all<{
      id: number;
      content: string;
      created_at: string;
      author_id: number;
      author_username: string;
      author_display_name: string;
      author_avatar: string;
    }>(
      `SELECT c.id, c.content, c.created_at,
             u.id AS author_id, u.username AS author_username,
             u.display_name AS author_display_name, u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

  const comments = rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: {
      id: r.author_id,
      username: r.author_username,
      displayName: r.author_display_name,
      avatarUrl: r.author_avatar,
    },
  }));

  return NextResponse.json({ comments });
}

// POST /api/posts/[id]/comments
export async function POST(req: NextRequest, { params }: Params) {
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

  const { content } = await req.json();
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 300) {
    return NextResponse.json(
      { error: "Comment must be 300 characters or fewer" },
      { status: 400 }
    );
  }

  const result = await db.run(
    "INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)",
    [me.userId, postId, content.trim()]
  );

  const comment = await db.get<{
      id: number;
      content: string;
      created_at: string;
      author_id: number;
      author_username: string;
      author_display_name: string;
      author_avatar: string;
    }>(
      `SELECT c.id, c.content, c.created_at,
              u.id AS author_id, u.username AS author_username,
              u.display_name AS author_display_name, u.avatar_url AS author_avatar
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [Number(result.lastInsertRowid)]
    );

  return NextResponse.json(
    {
      id: comment!.id,
      content: comment!.content,
      createdAt: comment!.created_at,
      author: {
        id: comment!.author_id,
        username: comment!.author_username,
        displayName: comment!.author_display_name,
        avatarUrl: comment!.author_avatar,
      },
    },
    { status: 201 }
  );
}

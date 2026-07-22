import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, displayName, email, password } = await req.json();

    if (!username || !displayName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 3–30 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username may only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
      .get(username, email);

    if (existing) {
      return NextResponse.json(
        { error: "Username or email already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run(username, displayName, email, passwordHash);

    const userId = result.lastInsertRowid as number;
    const token = signToken({ userId, username });
    const cookieOpts = setAuthCookie(token);

    const res = NextResponse.json(
      { id: userId, username, displayName },
      { status: 201 }
    );
    res.cookies.set(cookieOpts);
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

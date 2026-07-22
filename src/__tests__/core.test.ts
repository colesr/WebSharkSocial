/**
 * Unit tests for the database layer and auth utilities.
 * These test the core logic without starting a server.
 */

import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Set env before imports that use it
const TMP_DB = path.join("/tmp", `test-webshark-${process.pid}.db`);
process.env.JWT_SECRET = "test-secret-for-jest-only";
process.env.TURSO_DATABASE_URL = `file:${TMP_DB}`;

import { signToken, verifyToken } from "../lib/auth";
import db from "../lib/db";

afterAll(() => {
  if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
});

// ──────────────────────────────────────────────────────────
// Auth utilities
// ──────────────────────────────────────────────────────────
describe("auth utilities", () => {
  it("signToken / verifyToken round-trip", () => {
    const payload = { userId: 42, username: "tester" };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(42);
    expect(decoded!.username).toBe("tester");
  });

  it("verifyToken returns null for a bad token", () => {
    expect(verifyToken("not.a.valid.token")).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────
// Database: users
// ──────────────────────────────────────────────────────────
describe("database – users", () => {
  let userId: number;

  it("inserts a user", async () => {
    const hash = bcrypt.hashSync("password1", 1);
    const result = await db.run(
      "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
      ["alice", "Alice", "alice@example.com", hash]
    );
    userId = Number(result.lastInsertRowid);
    expect(userId).toBeGreaterThan(0);
  });

  it("retrieves the user by email", async () => {
    const user = await db.get<{ id: number; username: string }>(
      "SELECT id, username FROM users WHERE email = ?",
      ["alice@example.com"]
    );
    expect(user).toBeDefined();
    expect(user!.username).toBe("alice");
  });

  it("rejects duplicate username", async () => {
    const hash = bcrypt.hashSync("password2", 1);
    await expect(
      db.run(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
        ["alice", "Alice2", "alice2@example.com", hash]
      )
    ).rejects.toThrow();
  });

  it("password hash is valid", async () => {
    const user = await db.get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = ?",
      ["alice"]
    );
    expect(user).toBeDefined();
    const valid = await bcrypt.compare("password1", user!.password_hash);
    expect(valid).toBe(true);
  });

  it("wrong password fails comparison", async () => {
    const user = await db.get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = ?",
      ["alice"]
    );
    expect(user).toBeDefined();
    const valid = await bcrypt.compare("wrongpassword", user!.password_hash);
    expect(valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// Database: posts
// ──────────────────────────────────────────────────────────
describe("database – posts", () => {
  let userId: number;
  let postId: number;

  beforeAll(async () => {
    const hash = bcrypt.hashSync("pass", 1);
    const result = await db.run(
      "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
      ["bob", "Bob", "bob@example.com", hash]
    );
    userId = Number(result.lastInsertRowid);
  });

  it("creates a post", async () => {
    const result = await db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [
      userId,
      "Hello WebShark!",
    ]);
    postId = Number(result.lastInsertRowid);
    expect(postId).toBeGreaterThan(0);
  });

  it("retrieves the post", async () => {
    const post = await db.get<{ id: number; content: string }>(
      "SELECT id, content FROM posts WHERE id = ?",
      [postId]
    );
    expect(post!.content).toBe("Hello WebShark!");
  });

  it("cascade-deletes posts when user is deleted", async () => {
    await db.run("DELETE FROM users WHERE id = ?", [userId]);
    const post = await db.get("SELECT id FROM posts WHERE id = ?", [postId]);
    expect(post).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Database: follows
// ──────────────────────────────────────────────────────────
describe("database – follows", () => {
  let u1: number;
  let u2: number;

  beforeAll(async () => {
    const h = bcrypt.hashSync("p", 1);
    u1 = Number(
      (
        await db.run(
          "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
          ["carol", "Carol", "carol@example.com", h]
        )
      ).lastInsertRowid
    );
    u2 = Number(
      (
        await db.run(
          "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
          ["dave", "Dave", "dave@example.com", h]
        )
      ).lastInsertRowid
    );
  });

  it("carol follows dave", async () => {
    await db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [
      u1,
      u2,
    ]);

    const row = await db.get(
      "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
      [u1, u2]
    );
    expect(row).toBeDefined();
  });

  it("duplicate follow is ignored (INSERT OR IGNORE)", async () => {
    await expect(
      db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [
        u1,
        u2,
      ])
    ).resolves.toBeDefined();
  });

  it("self-follow is prevented by the API layer, not the DB constraint", async () => {
    // The database itself doesn't block self-follows; the API route does.
    // This is a deliberate design decision.
    await expect(
      db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [
        u1,
        u1,
      ])
    ).resolves.toBeDefined();
    // Clean up the self-follow
    await db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
      u1,
      u1,
    ]);
  });

  it("unfollow removes the row", async () => {
    await db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
      u1,
      u2,
    ]);
    const row = await db.get(
      "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
      [u1, u2]
    );
    expect(row).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Database: likes & comments
// ──────────────────────────────────────────────────────────
describe("database – likes & comments", () => {
  let userId: number;
  let postId: number;

  beforeAll(async () => {
    const h = bcrypt.hashSync("p", 1);
    userId = Number(
      (
        await db.run(
          "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
          ["eve", "Eve", "eve@example.com", h]
        )
      ).lastInsertRowid
    );
    postId = Number(
      (await db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [userId, "Test post"]))
        .lastInsertRowid
    );
  });

  it("likes a post, count becomes 1", async () => {
    await db.run("INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)", [
      userId,
      postId,
    ]);

    const likeRow = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
      [postId]
    );
    expect(likeRow?.count).toBe(1);
  });

  it("liking twice does not increment (INSERT OR IGNORE)", async () => {
    await db.run("INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)", [
      userId,
      postId,
    ]);

    const likeRow = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
      [postId]
    );
    expect(likeRow?.count).toBe(1);
  });

  it("unliking decrements count to 0", async () => {
    await db.run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [
      userId,
      postId,
    ]);

    const likeRow = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
      [postId]
    );
    expect(likeRow?.count).toBe(0);
  });

  it("adds a comment", async () => {
    const result = await db.run(
      "INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)",
      [userId, postId, "Nice post!"]
    );
    const commentId = Number(result.lastInsertRowid);
    expect(commentId).toBeGreaterThan(0);

    const comment = await db.get<{ content: string }>(
      "SELECT content FROM comments WHERE id = ?",
      [commentId]
    );
    expect(comment?.content).toBe("Nice post!");
  });

  it("comment count reflects entries", async () => {
    const commentRow = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM comments WHERE post_id = ?",
      [postId]
    );
    expect(commentRow?.count).toBe(1);
  });
});

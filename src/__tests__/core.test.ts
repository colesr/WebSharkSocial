/**
 * Unit tests for the database layer and auth utilities.
 * These test the core logic without starting a server.
 */

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../lib/auth";

const TMP_DB = path.join("/tmp", `test-webshark-${process.pid}.db`);

// Create an isolated in-memory test database
function createTestDb() {
  const db = new Database(TMP_DB);
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    UNIQUE NOT NULL COLLATE NOCASE,
      display_name TEXT   NOT NULL,
      email       TEXT    UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT  NOT NULL,
      bio         TEXT    DEFAULT '',
      avatar_url  TEXT    DEFAULT '',
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT    NOT NULL,
      image_url   TEXT    DEFAULT '',
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS follows (
      follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );
    CREATE TABLE IF NOT EXISTS likes (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, post_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );
  `);
  return db;
}

let db: Database.Database;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
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

  it("inserts a user", () => {
    const hash = bcrypt.hashSync("password1", 1);
    const result = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run("alice", "Alice", "alice@example.com", hash);
    userId = result.lastInsertRowid as number;
    expect(userId).toBeGreaterThan(0);
  });

  it("retrieves the user by email", () => {
    const user = db
      .prepare("SELECT id, username FROM users WHERE email = ?")
      .get("alice@example.com") as { id: number; username: string } | undefined;
    expect(user).toBeDefined();
    expect(user!.username).toBe("alice");
  });

  it("rejects duplicate username", () => {
    const hash = bcrypt.hashSync("password2", 1);
    expect(() =>
      db
        .prepare(
          "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
        )
        .run("alice", "Alice2", "alice2@example.com", hash)
    ).toThrow();
  });

  it("password hash is valid", async () => {
    const user = db
      .prepare("SELECT password_hash FROM users WHERE username = ?")
      .get("alice") as { password_hash: string };
    const valid = await bcrypt.compare("password1", user.password_hash);
    expect(valid).toBe(true);
  });

  it("wrong password fails comparison", async () => {
    const user = db
      .prepare("SELECT password_hash FROM users WHERE username = ?")
      .get("alice") as { password_hash: string };
    const valid = await bcrypt.compare("wrongpassword", user.password_hash);
    expect(valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// Database: posts
// ──────────────────────────────────────────────────────────
describe("database – posts", () => {
  let userId: number;
  let postId: number;

  beforeAll(() => {
    const hash = bcrypt.hashSync("pass", 1);
    const result = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run("bob", "Bob", "bob@example.com", hash);
    userId = result.lastInsertRowid as number;
  });

  it("creates a post", () => {
    const result = db
      .prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)")
      .run(userId, "Hello WebShark!");
    postId = result.lastInsertRowid as number;
    expect(postId).toBeGreaterThan(0);
  });

  it("retrieves the post", () => {
    const post = db
      .prepare("SELECT id, content FROM posts WHERE id = ?")
      .get(postId) as { id: number; content: string } | undefined;
    expect(post!.content).toBe("Hello WebShark!");
  });

  it("cascade-deletes posts when user is deleted", () => {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    expect(post).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Database: follows
// ──────────────────────────────────────────────────────────
describe("database – follows", () => {
  let u1: number;
  let u2: number;

  beforeAll(() => {
    const h = bcrypt.hashSync("p", 1);
    u1 = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run("carol", "Carol", "carol@example.com", h).lastInsertRowid as number;
    u2 = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run("dave", "Dave", "dave@example.com", h).lastInsertRowid as number;
  });

  it("carol follows dave", () => {
    db.prepare(
      "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)"
    ).run(u1, u2);

    const row = db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
      .get(u1, u2);
    expect(row).toBeDefined();
  });

  it("duplicate follow is ignored (INSERT OR IGNORE)", () => {
    expect(() =>
      db.prepare(
        "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)"
      ).run(u1, u2)
    ).not.toThrow();
  });

  it("self-follow is prevented by the API layer, not the DB constraint", () => {
    // The database itself doesn't block self-follows; the API route does.
    // This is a deliberate design decision.
    expect(() =>
      db.prepare(
        "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)"
      ).run(u1, u1)
    ).not.toThrow();
    // Clean up the self-follow
    db.prepare(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
    ).run(u1, u1);
  });

  it("unfollow removes the row", () => {
    db.prepare(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
    ).run(u1, u2);
    const row = db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
      .get(u1, u2);
    expect(row).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Database: likes & comments
// ──────────────────────────────────────────────────────────
describe("database – likes & comments", () => {
  let userId: number;
  let postId: number;

  beforeAll(() => {
    const h = bcrypt.hashSync("p", 1);
    userId = db
      .prepare(
        "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run("eve", "Eve", "eve@example.com", h).lastInsertRowid as number;
    postId = db
      .prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)")
      .run(userId, "Test post").lastInsertRowid as number;
  });

  it("likes a post, count becomes 1", () => {
    db.prepare(
      "INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)"
    ).run(userId, postId);

    const { count } = db
      .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
      .get(postId) as { count: number };
    expect(count).toBe(1);
  });

  it("liking twice does not increment (INSERT OR IGNORE)", () => {
    db.prepare(
      "INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)"
    ).run(userId, postId);

    const { count } = db
      .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
      .get(postId) as { count: number };
    expect(count).toBe(1);
  });

  it("unliking decrements count to 0", () => {
    db.prepare(
      "DELETE FROM likes WHERE user_id = ? AND post_id = ?"
    ).run(userId, postId);

    const { count } = db
      .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
      .get(postId) as { count: number };
    expect(count).toBe(0);
  });

  it("adds a comment", () => {
    const result = db
      .prepare("INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)")
      .run(userId, postId, "Nice post!");
    const commentId = result.lastInsertRowid as number;
    expect(commentId).toBeGreaterThan(0);

    const comment = db
      .prepare("SELECT content FROM comments WHERE id = ?")
      .get(commentId) as { content: string };
    expect(comment.content).toBe("Nice post!");
  });

  it("comment count reflects entries", () => {
    const { count } = db
      .prepare("SELECT COUNT(*) AS count FROM comments WHERE post_id = ?")
      .get(postId) as { count: number };
    expect(count).toBe(1);
  });
});

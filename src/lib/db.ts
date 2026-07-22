import "server-only";
import { createClient, Client, InArgs, Row, ResultSet } from "@libsql/client";

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    UNIQUE NOT NULL COLLATE NOCASE,
    display_name TEXT    NOT NULL,
    email        TEXT    UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT   NOT NULL,
    bio          TEXT    DEFAULT '',
    avatar_url   TEXT    DEFAULT '',
    created_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    image_url  TEXT    DEFAULT '',
    created_at TEXT    DEFAULT (datetime('now'))
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

  CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_likes_post_id     ON likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id  ON comments(post_id);
`;

type SqlArgs = InArgs;

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

function getRequiredEnv(name: "TURSO_DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

function toObject<T>(row: Row | undefined): T | undefined {
  return row ? ({ ...row } as T) : undefined;
}

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: getRequiredEnv("TURSO_DATABASE_URL"),
      authToken: process.env.TURSO_AUTH_TOKEN,
      intMode: "number",
    });

    initPromise = client.executeMultiple(schema).then(() => undefined);
  }

  return client;
}

async function ensureInitialized(): Promise<Client> {
  const db = getClient();
  if (initPromise) {
    await initPromise;
  }
  return db;
}

const db = {
  async get<T>(sql: string, args: SqlArgs = []): Promise<T | undefined> {
    const client = await ensureInitialized();
    const result = await client.execute({ sql, args });
    return toObject<T>(result.rows[0]);
  },

  async all<T>(sql: string, args: SqlArgs = []): Promise<T[]> {
    const client = await ensureInitialized();
    const result = await client.execute({ sql, args });
    return result.rows.map((row) => toObject<T>(row) as T);
  },

  async run(sql: string, args: SqlArgs = []): Promise<ResultSet> {
    const client = await ensureInitialized();
    return client.execute({ sql, args });
  },
};

export default db;

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { GroupDoc, UserRecord } from "./types";

/**
 * Storage abstraction for users + group documents. Uses Postgres when
 * DATABASE_URL is set (Render); otherwise a local JSON file for zero-setup dev.
 */
export interface Store {
  kind: "postgres" | "file";
  init(): Promise<void>;

  createUser(user: UserRecord): Promise<void>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;

  listGroups(userId: string): Promise<GroupDoc[]>;
  getGroup(id: string): Promise<GroupDoc | null>;
  saveGroup(doc: GroupDoc): Promise<GroupDoc>;
  deleteGroup(id: string): Promise<void>;
}

/* ---- Postgres ------------------------------------------------------------ */

class PostgresStore implements Store {
  kind = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS groups_user_idx ON groups (user_id)`
    );
  }

  async createUser(user: UserRecord) {
    await this.pool.query(
      `INSERT INTO users (id, email, data) VALUES ($1, $2, $3)`,
      [user.id, user.email.toLowerCase(), user]
    );
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `SELECT data FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    return res.rows[0]?.data ?? null;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const res = await this.pool.query(`SELECT data FROM users WHERE id = $1`, [
      id,
    ]);
    return res.rows[0]?.data ?? null;
  }

  async listGroups(userId: string): Promise<GroupDoc[]> {
    const res = await this.pool.query(
      `SELECT data FROM groups WHERE user_id = $1 ORDER BY (data->>'createdAt')::bigint ASC`,
      [userId]
    );
    return res.rows.map((r) => r.data as GroupDoc);
  }

  async getGroup(id: string): Promise<GroupDoc | null> {
    const res = await this.pool.query(`SELECT data FROM groups WHERE id = $1`, [
      id,
    ]);
    return res.rows[0]?.data ?? null;
  }

  async saveGroup(doc: GroupDoc): Promise<GroupDoc> {
    const next = { ...doc, updatedAt: Date.now() };
    await this.pool.query(
      `INSERT INTO groups (id, user_id, data, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = now()`,
      [next.id, next.userId, next]
    );
    return next;
  }

  async deleteGroup(id: string) {
    await this.pool.query(`DELETE FROM groups WHERE id = $1`, [id]);
  }
}

/* ---- File (dev fallback) ------------------------------------------------- */

interface FileData {
  users: Record<string, UserRecord>;
  groups: Record<string, GroupDoc>;
}

class FileStore implements Store {
  kind = "file" as const;
  private dir = path.join(__dirname, "..", "data");
  private file = path.join(this.dir, "db.json");

  async init() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    if (!fs.existsSync(this.file)) this.write({ users: {}, groups: {} });
  }

  private read(): FileData {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      return { users: {}, groups: {} };
    }
  }
  private write(data: FileData) {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  async createUser(user: UserRecord) {
    const db = this.read();
    db.users[user.id] = user;
    this.write(db);
  }
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const db = this.read();
    return (
      Object.values(db.users).find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  }
  async getUserById(id: string): Promise<UserRecord | null> {
    return this.read().users[id] ?? null;
  }
  async listGroups(userId: string): Promise<GroupDoc[]> {
    return Object.values(this.read().groups)
      .filter((g) => g.userId === userId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  async getGroup(id: string): Promise<GroupDoc | null> {
    return this.read().groups[id] ?? null;
  }
  async saveGroup(doc: GroupDoc): Promise<GroupDoc> {
    const db = this.read();
    const next = { ...doc, updatedAt: Date.now() };
    db.groups[next.id] = next;
    this.write(db);
    return next;
  }
  async deleteGroup(id: string) {
    const db = this.read();
    delete db.groups[id];
    this.write(db);
  }
}

export function createStore(): Store {
  const url = process.env.DATABASE_URL;
  return url ? new PostgresStore(url) : new FileStore();
}

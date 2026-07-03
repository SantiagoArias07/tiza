import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { GroupState, emptyState } from "./types";

/**
 * Storage abstraction. Uses Postgres when DATABASE_URL is set (production /
 * Render); otherwise falls back to a local JSON file so it runs with zero
 * setup in development.
 */
export interface Store {
  kind: "postgres" | "file";
  init(): Promise<void>;
  get(groupId: string): Promise<GroupState>;
  set(groupId: string, state: GroupState): Promise<GroupState>;
}

/* ---- Postgres ------------------------------------------------------------ */

class PostgresStore implements Store {
  kind = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Render's managed Postgres requires SSL.
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS group_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async get(groupId: string): Promise<GroupState> {
    const res = await this.pool.query(
      "SELECT data FROM group_state WHERE id = $1",
      [groupId]
    );
    if (res.rows.length === 0) return emptyState();
    return { ...emptyState(), ...(res.rows[0].data as GroupState) };
  }

  async set(groupId: string, state: GroupState): Promise<GroupState> {
    const next = { ...state, updatedAt: Date.now() };
    await this.pool.query(
      `INSERT INTO group_state (id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()`,
      [groupId, next]
    );
    return next;
  }
}

/* ---- File (dev fallback) ------------------------------------------------- */

class FileStore implements Store {
  kind = "file" as const;
  private dir = path.join(__dirname, "..", "data");
  private file = path.join(this.dir, "state.json");

  async init() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, "{}");
  }

  private readAll(): Record<string, GroupState> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      return {};
    }
  }

  async get(groupId: string): Promise<GroupState> {
    const all = this.readAll();
    return { ...emptyState(), ...(all[groupId] ?? {}) };
  }

  async set(groupId: string, state: GroupState): Promise<GroupState> {
    const all = this.readAll();
    const next = { ...state, updatedAt: Date.now() };
    all[groupId] = next;
    fs.writeFileSync(this.file, JSON.stringify(all, null, 2));
    return next;
  }
}

export function createStore(): Store {
  const url = process.env.DATABASE_URL;
  return url ? new PostgresStore(url) : new FileStore();
}

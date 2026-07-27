/**
 * Optional off-database backup mirror: pushes each user's daily snapshot to a
 * PRIVATE GitHub repository via the Contents API (one file per user, overwritten
 * daily — git keeps the history for free).
 *
 * Enabled only when both env vars are set:
 *   GITHUB_BACKUP_REPO   e.g. "santiagoarias07/tiza-backups"  (must be PRIVATE)
 *   GITHUB_BACKUP_TOKEN  fine-grained PAT scoped to that repo, Contents: Read+Write
 *
 * A PRIVATE REPO is used on purpose — GitHub Gists are publicly readable by URL,
 * which would expose student data.
 */
const REPO = process.env.GITHUB_BACKUP_REPO;
const TOKEN = process.env.GITHUB_BACKUP_TOKEN;

export const githubBackupEnabled = Boolean(REPO && TOKEN);

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "tiza-backup",
  "Content-Type": "application/json",
});

export async function pushBackup(userId: string, snapshot: unknown): Promise<void> {
  if (!githubBackupEnabled) return;
  const path = `backups/${userId}.json`;
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(
    path
  ).replace(/%2F/g, "/")}`;

  // Read current sha (needed to overwrite an existing file).
  let sha: string | undefined;
  try {
    const res = await fetch(url, { headers: headers() });
    if (res.ok) {
      const json = (await res.json()) as { sha?: string };
      sha = json.sha;
    }
  } catch {
    /* first run / transient — proceed to create */
  }

  const content = Buffer.from(JSON.stringify(snapshot, null, 2)).toString("base64");
  const day = (snapshot as { day?: string })?.day ?? "";
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: `Tiza backup ${day} (${userId})`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub backup failed: ${res.status} ${await res.text()}`);
  }
}

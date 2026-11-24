import { seedState } from "../public/domain.js";
export class ConflictError extends Error {
  constructor(
    message = "This record changed in another window. Refresh before saving.",
  ) {
    super(message);
    this.status = 409;
  }
}
export async function loadWorkspace(db) {
  const row = await db
    .prepare("SELECT revision, data_json FROM workspace_state WHERE id = ?")
    .bind("main")
    .first();
  return row
    ? { revision: row.revision, state: JSON.parse(row.data_json) }
    : { revision: 0, state: null };
}
export async function createWorkspace(db) {
  const s = seedState();
  s.bot = { history: [], outbox: [], sessions: {}, events: [] };
  s.buyers = s.buyers.map((b) => ({
    ...b,
    demo: true,
    whatsappPhone: "",
    autoUpdates: false,
  }));
  await db
    .prepare(
      "INSERT OR IGNORE INTO workspace_state (id,revision,data_json,updated_at) VALUES (?,1,?,?)",
    )
    .bind("main", JSON.stringify(s), new Date().toISOString())
    .run();
  return loadWorkspace(db);
}
export async function compareAndSwap(db, revision, state) {
  const r = await db
    .prepare(
      "UPDATE workspace_state SET revision=revision+1,data_json=?,updated_at=? WHERE id=? AND revision=?",
    )
    .bind(JSON.stringify(state), new Date().toISOString(), "main", revision)
    .run();
  if (r.meta.changes !== 1) throw new ConflictError();
  return { revision: revision + 1, state };
}
export async function mutateWorkspace(db, fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await loadWorkspace(db);
    if (!snapshot.state)
      throw Object.assign(
        new Error("Open LoCoMatch and load the demo workspace first."),
        { status: 409 },
      );
    const result = await fn(snapshot.state);
    if (result?.unchanged) return { ...snapshot, result };
    try {
      return {
        ...(await compareAndSwap(db, snapshot.revision, snapshot.state)),
        result,
      };
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt === 4) throw e;
    }
  }
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function mergeWorkspace(current, base, proposed) {
  const next = structuredClone(current);
  for (const collection of ["products", "buyers", "drafts"]) {
    const originals = new Map((base[collection] || []).map((r) => [r.id, r]));
    const updates = new Map((proposed[collection] || []).map((r) => [r.id, r]));
    const live = new Map((current[collection] || []).map((r) => [r.id, r]));
    for (const id of new Set([...originals.keys(), ...updates.keys()])) {
      const before = originals.get(id),
        after = updates.get(id);
      if (equal(before, after)) continue;
      if (!equal(live.get(id), before)) throw new ConflictError();
      if (after) live.set(id, after);
      else live.delete(id);
    }
    next[collection] = [...live.values()];
  }
  for (const collection of ["audit", "runs"]) {
    const keys = new Set(
      (next[collection] || []).map((r) => r.id || JSON.stringify(r)),
    );
    for (const item of proposed[collection] || [])
      if (!keys.has(item.id || JSON.stringify(item)))
        next[collection].push(item);
    next[collection] = next[collection].slice(-200);
  }
  return next;
}
const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (s) =>
  Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
async function encryptionKey(secret) {
  if (!secret) throw new Error("Server encryption is not configured.");
  return crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function saveCredentials(db, secret, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  const blob =
    bytesToBase64(iv) + "." + bytesToBase64(new Uint8Array(encrypted));
  await db
    .prepare(
      "INSERT INTO credentials (id,encrypted_value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET encrypted_value=excluded.encrypted_value",
    )
    .bind("twilio", blob)
    .run();
}
export async function getCredentials(db, secret) {
  const row = await db
    .prepare("SELECT encrypted_value FROM credentials WHERE id=?")
    .bind("twilio")
    .first();
  if (!row) return null;
  const [iv, data] = row.encrypted_value.split(".");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(secret),
    base64ToBytes(data),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

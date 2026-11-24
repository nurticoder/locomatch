import http from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import worker from "./server/worker.mjs";
const directory = ".local-state";
mkdirSync(directory, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(directory + "/locomatch.sqlite");
const migrations = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
);
db.exec("CREATE TABLE IF NOT EXISTS local_migrations (tag TEXT PRIMARY KEY)");
for (const m of migrations.entries)
  if (!db.prepare("SELECT tag FROM local_migrations WHERE tag=?").get(m.tag)) {
    db.exec(readFileSync("drizzle/" + m.tag + ".sql", "utf8"));
    db.prepare("INSERT INTO local_migrations (tag) VALUES (?)").run(m.tag);
  }
function adapter() {
  return {
    prepare(sql) {
      let values = [];
      const prepared = {
        bind(...args) {
          values = args;
          return prepared;
        },
        async first() {
          return db.prepare(sql).get(...values) || null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const r = db.prepare(sql).run(...values);
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return prepared;
    },
  };
}
const secretFile = directory + "/encryption-key";
if (!existsSync(secretFile))
  writeFileSync(secretFile, randomBytes(32).toString("base64"), {
    mode: 0o600,
  });
const port = Number(process.env.PORT || 5173),
  env = {
    DB: adapter(),
    LOCAL_DEMO: true,
    SECRET_ENCRYPTION_KEY: readFileSync(secretFile, "utf8"),
    PUBLIC_ORIGIN: "http://127.0.0.1:" + port,
  };
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 1600000) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(part);
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (!k.startsWith("oai-authenticated-user-") && v)
        headers.set(k, Array.isArray(v) ? v.join(",") : v);
    const request = new Request(env.PUBLIC_ORIGIN + req.url, {
      method: req.method,
      headers,
      ...(["GET", "HEAD"].includes(req.method)
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const response = await worker.fetch(request, env, {
      waitUntil: (promise) => promise.catch(() => {}),
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500).end("Local server error");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log("LoCoMatch shared local database ready at " + env.PUBLIC_ORIGIN),
);

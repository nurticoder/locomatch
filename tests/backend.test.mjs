import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { seedState, today, addDays } from "../public/domain.js";
import { extractStockNote, chineseNumber } from "../public/capture-domain.js";
import { handleAPI } from "../server/api.mjs";
import {
  handlePublicPreview,
  publicPreviewHTML,
} from "../server/public-preview.mjs";
import {
  mergeWorkspace,
  ConflictError,
  loadWorkspace,
  createWorkspace,
  saveCredentials,
  getCredentials,
} from "../server/store.mjs";
import {
  prepareAutomaticOffers,
  processIncoming,
  canAutoSend,
  twilioSignature,
  twiml,
  normalisePhone,
} from "../server/bot.mjs";
function setup() {
  const raw = new DatabaseSync(":memory:");
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json"));
  for (const entry of journal.entries)
    raw.exec(readFileSync("drizzle/" + entry.tag + ".sql", "utf8"));
  const DB = {
    prepare(sql) {
      let values = [];
      const q = {
        bind(...v) {
          values = v;
          return q;
        },
        async first() {
          return raw.prepare(sql).get(...values) || null;
        },
        async run() {
          const r = raw.prepare(sql).run(...values);
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return q;
    },
  };
  return {
    raw,
    env: {
      DB,
      OWNER_USER_ID: "owner",
      SECRET_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      PUBLIC_ORIGIN: "https://demo.example",
      SERVICE_SECRET: "test-service-secret",
    },
  };
}
const request = (path, method = "GET", body) =>
  new Request("https://demo.example" + path, {
    method,
    headers: {
      "oai-authenticated-user-id": "owner",
      Origin: "https://demo.example",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const state = () => {
  const s = seedState();
  s.buyers.forEach((b) => (b.demo = true));
  s.bot = { history: [], outbox: [], sessions: {}, events: [] };
  return s;
};
const incoming = (s, body, extra = {}) =>
  processIncoming(s, {
    from: "+85250000000",
    body,
    sid: crypto.randomUUID(),
    ...extra,
  });
const ctx = { waitUntil: (p) => p.catch(() => {}) };
test("speech and OCR text extract English product, quantity, price and labelled expiry", () => {
  const s = state();
  const r = extractStockNote(
    "Product: Orange marmalade\nQuantity: 40\nPrice HK$38\nBest before 2027-05-01",
    s.products,
  );
  assert.equal(r.productId, "p1");
  assert.equal(r.quantity, 40);
  assert.equal(r.price, 38);
  assert.equal(r.expiry, "2027-05-01");
});
test("Cantonese quantity extraction handles common tens and hundreds", () => {
  assert.equal(chineseNumber("四十"), 40);
  assert.equal(chineseNumber("一百二十五"), 125);
  const r = extractStockNote("四十罐橙 jam 做好啦", state().products);
  assert.equal(r.quantity, 40);
  assert.equal(r.productId, "p1");
  assert.equal(r.price, null);
  assert.equal(r.expiry, "");
});
test("unlabelled dates and absent quantities are never invented", () => {
  const r = extractStockNote("Roselle jam 2027-05-01", state().products);
  assert.equal(r.quantity, null);
  assert.equal(r.expiry, "");
  assert.equal(r.price, null);
});
test("workspace reads do not create seed data; initialise is explicit", async () => {
  const { env } = setup();
  assert.equal((await loadWorkspace(env.DB)).state, null);
  const r = await handleAPI(request("/api/workspace"), env, ctx);
  assert.equal((await r.json()).state, null);
  const created = await handleAPI(
    request("/api/initialise", "POST", {}),
    env,
    ctx,
  );
  assert.equal((await created.json()).state.products.length, 4);
});
test("anonymous staff API calls and foreign-origin writes are denied", async () => {
  const { env } = setup();
  assert.equal(
    (
      await handleAPI(
        new Request("https://demo.example/api/workspace"),
        env,
        ctx,
      )
    ).status,
    401,
  );
  const r = new Request("https://demo.example/api/initialise", {
    method: "POST",
    headers: {
      "oai-authenticated-user-id": "owner",
      Origin: "https://evil.example",
    },
  });
  assert.equal((await handleAPI(r, env, ctx)).status, 403);
});
test("independent browser edits merge without losing another product change", () => {
  const base = state(),
    current = structuredClone(base),
    proposed = structuredClone(base);
  current.products[0].notes = "Changed elsewhere";
  proposed.products[1].price = 40;
  const merged = mergeWorkspace(current, base, proposed);
  assert.equal(merged.products[0].notes, "Changed elsewhere");
  assert.equal(merged.products[1].price, 40);
});
test("conflicting changes to the same record are rejected", () => {
  const base = state(),
    current = structuredClone(base),
    proposed = structuredClone(base);
  current.products[0].price = 39;
  proposed.products[0].price = 40;
  assert.throws(() => mergeWorkspace(current, base, proposed), ConflictError);
});
test("verification creates four matching offers once; unverified input creates none", () => {
  const before = state(),
    after = structuredClone(before);
  after.products[0].quantity = 121;
  assert.equal(prepareAutomaticOffers(before, after), 4);
  assert.equal(prepareAutomaticOffers(before, after), 0);
  const p = structuredClone(before);
  p.products[1].quantity = 100;
  assert.equal(prepareAutomaticOffers(before, p), 0);
});
test("server rejects an attempted verified product with incomplete facts", async () => {
  const { env } = setup();
  const base = await createWorkspace(env.DB),
    next = structuredClone(base.state);
  next.products[1].status = "verified";
  next.products[1].reviewer = "Reviewer";
  const r = await handleAPI(
    request("/api/workspace", "PUT", { base: base.state, state: next }),
    env,
    ctx,
  );
  assert.equal(r.status, 400);
});
test("server persists verification and prepares offers in the same update", async () => {
  const { env } = setup();
  const base = await createWorkspace(env.DB),
    next = structuredClone(base.state);
  next.products[0].quantity = 130;
  const r = await handleAPI(
    request("/api/workspace", "PUT", { base: base.state, state: next }),
    env,
    ctx,
  );
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.generated, 4);
  assert.equal(data.state.bot.outbox.length, 4);
  assert.equal((await loadWorkspace(env.DB)).state.products[0].quantity, 130);
});
test("customer JOIN and OFFERS use the latest verified database facts", () => {
  const s = state();
  assert.match(incoming(s, "JOIN b1").text, /Harbour Pantry/);
  s.products[0].price = 39;
  assert.match(incoming(s, "OFFERS").text, /HK\$39/);
  s.products[0].status = "pending";
  assert.match(incoming(s, "OFFERS").text, /no verified products/);
});
test("duplicate message IDs do not generate a second reply", () => {
  const s = state();
  incoming(s, "JOIN b1", { sid: "same" });
  const result = incoming(s, "JOIN b1", { sid: "same" });
  assert.equal(result.duplicate, true);
  assert.equal(result.text, "");
  assert.equal(s.bot.history.length, 2);
});
test("STOP takes effect immediately and START restores explicit opt-in", () => {
  const s = state();
  incoming(s, "JOIN b1");
  incoming(s, "START");
  assert.equal(s.buyers[0].autoUpdates, true);
  incoming(s, "STOP");
  assert.equal(s.buyers[0].suppressed, true);
  assert.match(incoming(s, "OFFERS").text, /paused/);
  incoming(s, "START");
  assert.equal(s.buyers[0].suppressed, false);
});
test("simulation cannot subscribe or suppress a real customer", () => {
  const s = state();
  incoming(s, "JOIN b1", { simulation: true });
  incoming(s, "START", { simulation: true });
  assert.notEqual(s.buyers[0].autoUpdates, true);
  incoming(s, "STOP", { simulation: true });
  assert.equal(s.buyers[0].suppressed, false);
});
test("producer text creates a pending record without guessed expiry or confirmation", () => {
  const s = state();
  incoming(s, "JOIN worker");
  incoming(s, "Orange marmalade 40 jars");
  const p = s.products.at(-1);
  assert.equal(p.quantity, 40);
  assert.equal(p.status, "pending");
  assert.equal(p.expiry, "");
  assert.equal(p.confirmed, false);
  assert.equal(p.reviewer, "");
});
test("automatic sending needs opt-in, a fresh session and current offer facts", () => {
  const s = state();
  incoming(s, "JOIN b1");
  incoming(s, "START");
  const before = structuredClone(s);
  s.products[0].quantity = 121;
  prepareAutomaticOffers(before, s);
  const offer = s.bot.outbox.find((o) => o.buyerId === "b1"),
    phone = "+85250000000";
  assert(canAutoSend(s, offer, phone));
  s.bot.sessions[phone].lastInbound = new Date(
    Date.now() - 25 * 3600000,
  ).toISOString();
  assert(!canAutoSend(s, offer, phone));
  s.bot.sessions[phone].lastInbound = new Date().toISOString();
  s.products[0].price = 39;
  assert(!canAutoSend(s, offer, phone));
});
test("customer requirement edits invalidate a prepared automatic message", () => {
  const s = state();
  incoming(s, "JOIN b1");
  incoming(s, "START");
  const before = structuredClone(s);
  s.products[0].quantity = 121;
  prepareAutomaticOffers(before, s);
  const offer = s.bot.outbox.find((o) => o.buyerId === "b1");
  s.buyers[0].quantity = 24;
  assert(!canAutoSend(s, offer, "+85250000000"));
});
test("credentials are encrypted at rest and recoverable only with the server key", async () => {
  const { env, raw } = setup(),
    c = {
      accountSid: "AC" + "a".repeat(32),
      authToken: "b".repeat(32),
      phone: "+17372508034",
    };
  await saveCredentials(env.DB, env.SECRET_ENCRYPTION_KEY, c);
  const stored = raw
    .prepare("SELECT encrypted_value FROM credentials")
    .get().encrypted_value;
  assert(!stored.includes(c.authToken));
  assert(!stored.includes(c.accountSid));
  assert.deepEqual(await getCredentials(env.DB, env.SECRET_ENCRYPTION_KEY), c);
  await assert.rejects(() =>
    getCredentials(env.DB, randomBytes(32).toString("base64")),
  );
});
test("Twilio signature matches the documented validation vector", async () => {
  const params = new URLSearchParams({
    CallSid: "CA1234567890ABCDE",
    Caller: "+14158675310",
    Digits: "1234",
    From: "+14158675310",
    To: "+18005551212",
  });
  assert.equal(
    await twilioSignature(
      "12345",
      "https://example.com/myapp.php?foo=1&bar=2",
      params,
    ),
    "L/OH5YylLD5NRKLltdqwSvS0BnU=",
  );
});
test("signed WhatsApp webhook replies; invalid signature and wrong account are rejected", async () => {
  const { env } = setup();
  await createWorkspace(env.DB);
  const c = {
    accountSid: "AC" + "a".repeat(32),
    authToken: "b".repeat(32),
    phone: "+17372508034",
  };
  await saveCredentials(env.DB, env.SECRET_ENCRYPTION_KEY, c);
  const params = new URLSearchParams({
    AccountSid: c.accountSid,
    MessageSid: "SM" + "c".repeat(32),
    From: "whatsapp:+85250000000",
    To: "whatsapp:" + c.phone,
    Body: "JOIN b1",
  });
  const url = "https://demo.example/api/whatsapp/incoming";
  const signature = await twilioSignature(c.authToken, url, params);
  const make = (sig) =>
    new Request(url, {
      method: "POST",
      headers: {
        "X-Twilio-Signature": sig,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
  const result = await handleAPI(make(signature), env, ctx);
  assert.equal(result.status, 200);
  assert.match(await result.text(), /Harbour Pantry/);
  assert.equal((await handleAPI(make("wrong"), env, ctx)).status, 403);
  const repeated = await handleAPI(make(signature), env, ctx);
  assert.equal(await repeated.text(), twiml(""));
});
test("TwiML escapes imported text and phone normalisation rejects invalid senders", () => {
  assert.match(twiml('<script>&"'), /&lt;script&gt;&amp;&quot;/);
  assert.equal(normalisePhone("whatsapp:+852 5000 0000"), "+85250000000");
  assert.equal(normalisePhone("bad"), "");
});

test("a real customer's language choice is used in automatic promotions", () => {
  const s = state();
  incoming(s, "JOIN b1");
  incoming(s, "ZH");
  incoming(s, "START");
  const before = structuredClone(s);
  s.products[0].quantity = 121;
  prepareAutomaticOffers(before, s);
  const offer = s.bot.outbox.find((o) => o.buyerId === "b1");
  assert.match(offer.body, /本地香橙果醬/);
});

const anonymousPreview = (path, method = "GET", body) =>
  new Request("https://demo.example/api/demo" + path, {
    method,
    headers: {
      Origin: "https://demo.example",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
test("public preview opens without an account and uses its own database row", async () => {
  const { env } = setup();
  const main = await createWorkspace(env.DB);
  main.state.products[0].name = "Private product";
  await env.DB.prepare("UPDATE workspace_state SET data_json=? WHERE id=?")
    .bind(JSON.stringify(main.state), "main")
    .run();
  const r = await handlePublicPreview(
    anonymousPreview("/initialise", "POST", {}),
    env,
    ctx,
  );
  assert.equal(r.status, 200);
  const preview = await r.json();
  assert.equal(preview.state.products[0].name, "Orange marmalade");
  assert.equal(
    (await loadWorkspace(env.DB)).state.products[0].name,
    "Private product",
  );
  const result = await handlePublicPreview(
    anonymousPreview("/workspace"),
    env,
    ctx,
  );
  assert.equal(result.status, 200);
});
test("public visitors can edit and verify demo records without sending real messages", async () => {
  const { env } = setup();
  await createWorkspace(env.DB);
  const init = await handlePublicPreview(
    anonymousPreview("/initialise", "POST", {}),
    env,
    ctx,
  );
  const base = await init.json(),
    next = structuredClone(base.state);
  next.products[0].quantity = 121;
  let dispatches = 0;
  const r = await handlePublicPreview(
    anonymousPreview("/workspace", "PUT", { base: base.state, state: next }),
    env,
    { waitUntil: () => dispatches++ },
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).generated, 4);
  assert.equal(dispatches, 0);
  assert.equal((await loadWorkspace(env.DB)).state.products[0].quantity, 120);
});
test("public demo cannot access credentials, live webhooks, identity or dispatch", async () => {
  const { env } = setup();
  for (const path of [
    "/settings/whatsapp",
    "/bot/dispatch",
    "/whatsapp/incoming",
    "/identity",
  ]) {
    for (const method of ["GET", "POST"]) {
      const r = await handlePublicPreview(
        anonymousPreview(path, method, method === "POST" ? {} : undefined),
        env,
        ctx,
      );
      assert.equal(r.status, 403, path + method);
    }
  }
  assert.equal(
    (
      await handleAPI(
        new Request("https://demo.example/api/workspace"),
        env,
        ctx,
      )
    ).status,
    401,
  );
});
test("public preview rejects writes from another site", async () => {
  const { env } = setup();
  const r = await handlePublicPreview(
    new Request("https://demo.example/api/demo/initialise", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: "{}",
    }),
    env,
    ctx,
  );
  assert.equal(r.status, 403);
});
test("public preview HTML anchors assets at the site root and selects the demo API", () => {
  const html = publicPreviewHTML("<html><head></head><body></body></html>");
  assert.match(html, /<base href="\/">/);
  assert.match(html, /locomatch-public-demo/);
});

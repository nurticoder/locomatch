import { seedState, productIssues } from "../public/domain.js";
import {
  loadWorkspace,
  createWorkspace,
  compareAndSwap,
  mutateWorkspace,
  mergeWorkspace,
  getCredentials,
  saveCredentials,
} from "./store.mjs";
import {
  normalisePhone,
  twilioSignature,
  timingSafeEqual,
  twiml,
  processIncoming,
  prepareAutomaticOffers,
  canAutoSend,
} from "./bot.mjs";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function isStaff(request, env) {
  return (
    (env.OWNER_USER_ID &&
      request.headers.get("oai-authenticated-user-id") === env.OWNER_USER_ID) ||
    (env.SERVICE_SECRET &&
      timingSafeEqual(
        request.headers.get("X-LoCoMatch-Service"),
        env.SERVICE_SECRET,
      )) ||
    env.LOCAL_DEMO === true
  );
}
async function readJSON(request) {
  const body = await request.text();
  if (body.length > 1500000)
    throw Object.assign(new Error("This update is too large."), {
      status: 413,
    });
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { status: 400 });
  }
}
function validateWorkspace(s) {
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.products) ||
    !Array.isArray(s.buyers) ||
    !Array.isArray(s.drafts) ||
    !Array.isArray(s.audit) ||
    !Array.isArray(s.runs)
  )
    throw Object.assign(new Error("Invalid workspace data."), { status: 400 });
  for (const [key, max] of [
    ["products", 250],
    ["buyers", 200],
    ["drafts", 500],
  ]) {
    if (s[key].length > max)
      throw Object.assign(new Error(`Too many ${key} for this pilot.`), {
        status: 400,
      });
    const ids = new Set();
    for (const row of s[key]) {
      if (typeof row.id !== "string" || !row.id || ids.has(row.id))
        throw Object.assign(new Error("Record identifiers must be unique."), {
          status: 400,
        });
      ids.add(row.id);
    }
  }
  for (const p of s.products) {
    if (
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 120 ||
      !Array.isArray(p.districts)
    )
      throw Object.assign(
        new Error("A valid product name and delivery areas are required."),
        { status: 400 },
      );
    if (
      p.status === "verified" &&
      (!p.reviewer?.trim() || productIssues(p).length)
    )
      throw Object.assign(
        new Error("Verified records need complete facts and a named reviewer."),
        { status: 400 },
      );
  }
  for (const b of s.buyers)
    if (
      typeof b.name !== "string" ||
      !b.name.trim() ||
      !Array.isArray(b.categories) ||
      !Array.isArray(b.storage) ||
      !Number.isInteger(b.quantity) ||
      b.quantity < 1 ||
      !Number.isFinite(b.maxPrice) ||
      b.maxPrice <= 0
    )
      throw Object.assign(
        new Error("Customer purchasing requirements are incomplete."),
        { status: 400 },
      );
}
async function credentials(env) {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN)
    return {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      phone: env.TWILIO_WHATSAPP_FROM,
    };
  return getCredentials(env.DB, env.SECRET_ENCRYPTION_KEY);
}
function botHeaders() {
  return {
    "Content-Type": "text/xml; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}
async function webhook(request, env, path) {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const text = await request.text();
  if (text.length > 64000)
    return new Response("Request too large", { status: 413 });
  const c = await credentials(env);
  if (!c) return new Response("WhatsApp is not configured", { status: 503 });
  const params = new URLSearchParams(text),
    canonical = env.PUBLIC_ORIGIN + path;
  const expected = await twilioSignature(c.authToken, canonical, params);
  if (
    !timingSafeEqual(request.headers.get("X-Twilio-Signature"), expected) ||
    params.get("AccountSid") !== c.accountSid
  )
    return new Response("Invalid signature", { status: 403 });
  if (path.startsWith("/api/whatsapp/status")) {
    const id = new URL(request.url).searchParams.get("offerId");
    await mutateWorkspace(env.DB, (s) => {
      const offer = s.bot?.outbox.find((o) => o.id === id);
      if (!offer) return { unchanged: true };
      const sid = params.get("MessageSid");
      if (offer.providerSid && offer.providerSid !== sid)
        return { unchanged: true };
      offer.providerSid = sid;
      offer.status = params.get("MessageStatus") || offer.status;
      offer.errorCode = params.get("ErrorCode") || null;
      offer.updatedAt = new Date().toISOString();
    });
    return new Response("", { status: 204 });
  }
  if (normalisePhone(params.get("To")) !== normalisePhone(c.phone))
    return new Response("Incorrect recipient", { status: 403 });
  const sid = params.get("MessageSid");
  if (!/^SM[a-z0-9]{32}$/i.test(sid || ""))
    return new Response("Invalid message ID", { status: 400 });
  const r = await mutateWorkspace(env.DB, (s) =>
    processIncoming(s, {
      from: params.get("From"),
      body: params.get("Body"),
      sid,
    }),
  );
  return new Response(twiml(r.result.text), { headers: botHeaders() });
}
export async function dispatchOffers(env) {
  const c = await credentials(env);
  if (!c) return;
  const snapshot = await loadWorkspace(env.DB);
  if (!snapshot.state) return;
  const candidates =
    snapshot.state.bot?.outbox.filter((m) => m.status === "ready").slice(-30) ||
    [];
  let sent = 0;
  for (const candidate of candidates) {
    const current = await loadWorkspace(env.DB),
      phones = Object.keys(current.state.bot.sessions);
    const phone = phones.find((phone) =>
      canAutoSend(current.state, candidate, phone),
    );
    if (!phone || sent >= 10) continue;
    const claim = await mutateWorkspace(env.DB, (s) => {
      const offer = s.bot.outbox.find((m) => m.id === candidate.id);
      if (!offer || !canAutoSend(s, offer, phone)) return { unchanged: true };
      offer.status = "sending";
      offer.to = phone;
      offer.attemptedAt = new Date().toISOString();
      return { offer: structuredClone(offer) };
    });
    if (!claim.result.offer) continue;
    const offer = claim.result.offer;
    let status = "uncertain",
      providerSid = null,
      errorCode = null;
    try {
      const body = new URLSearchParams({
        To: "whatsapp:" + phone,
        From: "whatsapp:" + normalisePhone(c.phone),
        Body: offer.body,
        StatusCallback:
          env.PUBLIC_ORIGIN +
          "/api/whatsapp/status?offerId=" +
          encodeURIComponent(offer.id),
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(c.accountSid + ":" + c.authToken),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
          signal: AbortSignal.timeout(12000),
        },
      );
      const result = await response.json();
      if (response.ok && result.sid) {
        status = "accepted";
        providerSid = result.sid;
      } else {
        status = response.status >= 500 ? "uncertain" : "failed";
        errorCode = result.code || response.status;
      }
    } catch {
      status = "uncertain";
    }
    await mutateWorkspace(env.DB, (s) => {
      const m = s.bot.outbox.find((m) => m.id === offer.id);
      if (!m) return { unchanged: true };
      if (["sending", "accepted"].includes(m.status)) m.status = status;
      m.providerSid ||= providerSid;
      m.errorCode = errorCode;
      m.updatedAt = new Date().toISOString();
    });
    sent++;
  }
}
export async function handleAPI(request, env, ctx = { waitUntil: () => {} }) {
  const u = new URL(request.url),
    path = u.pathname;
  try {
    if (path === "/api/whatsapp/incoming" || path === "/api/whatsapp/status")
      return await webhook(request, env, u.pathname + u.search);
    if (path === "/api/identity" && request.method === "GET") {
      const userId = request.headers.get("oai-authenticated-user-id");
      return userId
        ? json({ authenticated: true, userId })
        : json({ authenticated: false }, 401);
    }
    if (!isStaff(request, env))
      return json(
        {
          error: "Sign in to the staff workspace.",
          signIn: "/signin-with-chatgpt?returnTo=%2F",
        },
        401,
      );
    if (
      request.method !== "GET" &&
      request.headers.get("Origin") !== u.origin &&
      !env.LOCAL_DEMO &&
      !timingSafeEqual(
        request.headers.get("X-LoCoMatch-Service"),
        env.SERVICE_SECRET,
      )
    )
      return json(
        { error: "This request must come from the LoCoMatch page." },
        403,
      );
    if (path === "/api/workspace" && request.method === "GET")
      return json(await loadWorkspace(env.DB));
    if (path === "/api/initialise" && request.method === "POST")
      return json(await createWorkspace(env.DB));
    if (path === "/api/workspace" && request.method === "PUT") {
      const body = await readJSON(request);
      validateWorkspace(body.state);
      validateWorkspace(body.base);
      const r = await mutateWorkspace(env.DB, (current) => {
        const before = structuredClone(current),
          next = mergeWorkspace(current, body.base, body.state);
        validateWorkspace(next);
        const generated = prepareAutomaticOffers(before, next);
        Object.assign(current, next);
        return { generated };
      });
      ctx.waitUntil(dispatchOffers(env).catch(() => {}));
      return json({
        revision: r.revision,
        state: r.state,
        generated: r.result.generated,
      });
    }
    if (path === "/api/reset" && request.method === "POST") {
      const r = await mutateWorkspace(env.DB, (s) => {
        const fresh = seedState();
        fresh.buyers = fresh.buyers.map((b) => {
          const old = s.buyers.find((v) => v.id === b.id);
          return {
            ...b,
            demo: true,
            autoUpdates: old?.autoUpdates || false,
            suppressed: old?.suppressed ?? b.suppressed,
            authorised: old?.authorised ?? b.authorised,
            whatsappPhone: old?.whatsappPhone || "",
          };
        });
        const bot = s.bot;
        for (const offer of bot?.outbox || [])
          if (offer.status === "ready") offer.status = "cancelled";
        Object.assign(s, fresh);
        s.bot = bot;
        return {};
      });
      return json({ revision: r.revision, state: r.state });
    }
    if (path === "/api/bot/simulate" && request.method === "POST") {
      const body = await readJSON(request);
      const r = await mutateWorkspace(env.DB, (s) =>
        processIncoming(s, {
          from: "+10000000001",
          body: body.message,
          sid: "sim-" + crypto.randomUUID(),
          simulation: true,
        }),
      );
      return json({
        revision: r.revision,
        state: r.state,
        reply: r.result.text,
      });
    }
    if (path === "/api/bot/dispatch" && request.method === "POST") {
      ctx.waitUntil(dispatchOffers(env).catch(() => {}));
      return json({ queued: true });
    }
    if (path === "/api/settings/whatsapp" && request.method === "GET") {
      const c = await credentials(env);
      return json({
        configured: !!c,
        accountSid: c?.accountSid || env.DEMO_TWILIO_ACCOUNT_SID || "",
        phone: c?.phone || env.DEMO_TWILIO_WHATSAPP_FROM || "",
        webhookUrl: env.PUBLIC_ORIGIN + "/api/whatsapp/incoming",
      });
    }
    if (path === "/api/settings/whatsapp" && request.method === "POST") {
      const body = await readJSON(request),
        phone = normalisePhone(body.phone);
      if (
        !/^AC[a-f0-9]{32}$/i.test(body.accountSid || "") ||
        !/^[a-f0-9]{32}$/i.test(body.authToken || "") ||
        !phone
      )
        return json(
          {
            error:
              "Check the Account SID, Auth Token and WhatsApp test number.",
          },
          400,
        );
      let verified = false;
      try {
        const check = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${body.accountSid}.json`,
          {
            headers: {
              Authorization:
                "Basic " + btoa(body.accountSid + ":" + body.authToken),
            },
            signal: AbortSignal.timeout(10000),
          },
        );
        verified = check.ok;
      } catch {}
      if (!verified)
        return json(
          {
            error:
              "Twilio could not verify these credentials. Check them in your Twilio console.",
          },
          400,
        );
      await saveCredentials(env.DB, env.SECRET_ENCRYPTION_KEY, {
        accountSid: body.accountSid,
        authToken: body.authToken,
        phone,
      });
      return json({
        configured: true,
        phone,
        webhookUrl: env.PUBLIC_ORIGIN + "/api/whatsapp/incoming",
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json(
      {
        error: e.status
          ? e.message
          : "The server could not complete this request. Try again.",
        code: e.status === 409 ? "conflict" : undefined,
      },
      e.status || 500,
    );
  }
}

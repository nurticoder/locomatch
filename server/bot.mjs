import {
  matchBuyer,
  productIssues,
  today,
  createMessage,
} from "../public/domain.js";
import { extractStockNote } from "../public/capture-domain.js";
export const normalisePhone = (value) => {
  const s = String(value || "")
    .replace(/^whatsapp:/i, "")
    .replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : "";
};
export const xmlEscape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export const twiml = (text) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response>${text ? `<Message>${xmlEscape(text)}</Message>` : ""}</Response>`;
export async function twilioSignature(token, url, params) {
  let text = url;
  for (const key of [...new Set(params.keys())].sort())
    for (const value of params.getAll(key).sort()) text += key + value;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)),
      ),
    ),
  );
}
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const botState = (s) =>
  (s.bot ??= { history: [], outbox: [], sessions: {}, events: [] });
const history = (s, item) => {
  botState(s).history.push({
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    ...item,
  });
  s.bot.history = s.bot.history.slice(-300);
};
const offerKey = (p, b) => `${p.id}:${p.verifiedAt}:${b.id}`;
export function prepareAutomaticOffers(before, after) {
  const bot = botState(after);
  let count = 0;
  for (const p of after.products) {
    const old = before.products.find((v) => v.id === p.id);
    if (
      p.status !== "verified" ||
      productIssues(p).length ||
      !p.reviewer ||
      JSON.stringify(old) === JSON.stringify(p)
    )
      continue;
    for (const b of after.buyers) {
      if (!matchBuyer(p, b).eligible) continue;
      const key = offerKey(p, b);
      if (bot.outbox.some((m) => m.key === key)) continue;
      bot.outbox.push({
        id: crypto.randomUUID(),
        key,
        productId: p.id,
        buyerId: b.id,
        productSnapshot: JSON.stringify(p),
        buyerSnapshot: JSON.stringify(b),
        body: createMessage(p, b, {
          channel: "whatsapp",
          language: b.language || "en",
        }),
        status: "ready",
        createdAt: new Date().toISOString(),
        reason: "Verified stock matches customer requirements",
      });
      count++;
    }
  }
  bot.outbox = bot.outbox.slice(-500);
  return count;
}
export function promotionFor(s, b, language) {
  const eligible = s.products
    .filter((p) => matchBuyer(p, b).eligible)
    .sort((a, b) => String(b.verifiedAt).localeCompare(String(a.verifiedAt)));
  if (!eligible.length)
    return language === "zh"
      ? "目前沒有符合你採購要求的已核實產品。我們不會推薦未核實庫存。"
      : "There are no verified products that meet your recorded purchasing requirements right now.";
  const p = eligible[0];
  return `${language === "zh" ? "LoCoMatch 課堂示範｜最新供應" : "LoCoMatch classroom demo | Latest offer"}\n\n${createMessage(p, b, { channel: "whatsapp", language })}\n\n${language === "zh" ? "回覆 START 訂閱更新，STOP 取消。庫存尚未預留。" : "Reply START to opt in to new-stock updates, or STOP to opt out. Stock is not reserved."}`;
}
const help =
  "LoCoMatch classroom demo.\n\nJOIN b1 — try Harbour Pantry as a customer\nJOIN worker — report stock as a producer\nOFFERS — get an offer from the latest verified stock\nSTART — subscribe to matching stock updates\nSTOP — opt out\nZH / EN — choose message language\n\nProducts and customers in this demo are fictional.";
export function processIncoming(s, { from, body, sid, simulation = false }) {
  const bot = botState(s),
    phone = normalisePhone(from);
  if (!phone)
    throw Object.assign(new Error("A valid WhatsApp sender is required."), {
      status: 400,
    });
  if (bot.events.includes(sid)) return { duplicate: true, text: "" };
  bot.events.push(sid);
  bot.events = bot.events.slice(-1000);
  let session = bot.sessions[phone];
  const text = String(body || "")
      .trim()
      .slice(0, 2000),
    upper = text.toUpperCase();
  history(s, { direction: "in", phone, body: text, simulation });
  let reply;
  if (/^JOIN\s+WORKER$/i.test(text)) {
    session = bot.sessions[phone] = {
      role: "worker",
      language: "en",
      lastInbound: new Date().toISOString(),
      simulation,
    };
    reply =
      "You are in producer demo mode. Send a stock note, for example:\n\nOrange marmalade 40 jars. Best before 2027-05-01.\n\nOr use the LoCoMatch page to speak or photograph your sheet. Your update stays unverified until a staff reviewer checks it. Reply JOIN b1 to switch to customer mode.";
  } else if (/^JOIN\s+B\d+$/i.test(text)) {
    const id = text.split(/\s+/)[1].toLowerCase(),
      b = s.buyers.find((b) => b.id === id && b.demo === true);
    if (b) {
      session = bot.sessions[phone] = {
        role: "customer",
        buyerId: b.id,
        language: b.language || "en",
        lastInbound: new Date().toISOString(),
        simulation,
      };
      reply = `Linked to demo customer ${b.name}. Reply OFFERS for a promotion using the latest verified stock. Reply START to subscribe to matching stock updates.`;
    } else
      reply = "That demo customer is not available. Reply JOIN b1 or HELP.";
  } else if (!session) reply = help;
  else {
    session.lastInbound = new Date().toISOString();
    if (upper === "ZH" || upper === "中文") {
      session.language = "zh";
      if (!simulation && session.role === "customer") {
        const b = s.buyers.find((b) => b.id === session.buyerId);
        if (b) b.language = "zh";
      }
      reply = "已切換至繁體中文。回覆 OFFERS 查看最新供應。";
    } else if (upper === "EN") {
      session.language = "en";
      if (!simulation && session.role === "customer") {
        const b = s.buyers.find((b) => b.id === session.buyerId);
        if (b) b.language = "en";
      }
      reply = "English selected. Reply OFFERS for the latest offer.";
    } else if (upper === "HELP" || upper === "幫助") reply = help;
    else if (session.role === "worker") {
      const extracted = extractStockNote(text, s.products),
        base = s.products.find((p) => p.id === extracted.productId);
      if (
        !base ||
        !Number.isInteger(extracted.quantity) ||
        extracted.quantity <= 0
      )
        reply =
          "Please include a product name and jar quantity, for example: Orange marmalade 40 jars. Or use the photo/voice upload on the LoCoMatch page.";
      else {
        const p = {
          ...base,
          id: crypto.randomUUID(),
          quantity: extracted.quantity,
          price: extracted.price ?? base.price,
          available: today(),
          expiry: extracted.expiry,
          status: "pending",
          reviewer: "",
          verifiedAt: null,
          confirmed: false,
          source: "WhatsApp production note " + sid,
          notes: text,
          sourceMethod: "whatsapp",
        };
        s.products.push(p);
        reply = `Saved for review: ${p.name}, ${p.quantity} jars${p.expiry ? ", best before " + p.expiry : ""}. A staff reviewer must confirm the stock and missing facts before any promotion uses it.`;
      }
    } else {
      const b = s.buyers.find((b) => b.id === session.buyerId);
      if (!b)
        reply =
          "Your customer profile is no longer available. Please contact FarmShare.";
      else if (["STOP", "UNSUBSCRIBE", "取消", "退訂"].includes(upper)) {
        session.optIn = false;
        session.optedOut = true;
        if (!simulation) {
          b.suppressed = true;
          b.autoUpdates = false;
        }
        reply =
          session.language === "zh"
            ? "已取消推廣更新。回覆 START 可重新訂閱。"
            : "You have opted out of promotions. Reply START to opt in again.";
      } else if (["START", "SUBSCRIBE", "訂閱"].includes(upper)) {
        session.optIn = true;
        session.optedOut = false;
        if (!simulation) {
          b.suppressed = false;
          b.authorised = true;
          b.autoUpdates = true;
        }
        reply =
          session.language === "zh"
            ? "已訂閱。新庫存核實後，我們會在WhatsApp允許的24小時回覆時段內發送合適供應。回覆 OFFERS 查看最新供應。"
            : "Subscribed. When new stock is verified, matching updates can be sent within the active 24-hour WhatsApp reply window. Reply OFFERS for the latest offer.";
      } else if (b.suppressed || session.optedOut)
        reply =
          "Promotions are paused for you. Reply START if you would like to opt in again.";
      else reply = promotionFor(s, b, session.language || "en");
    }
  }
  history(s, {
    direction: "out",
    phone,
    body: reply,
    simulation,
    status: simulation ? "simulation" : "reply-prepared",
  });
  return { text: reply, duplicate: false };
}
export function canAutoSend(s, offer, phone, now = Date.now()) {
  const b = s.buyers.find((b) => b.id === offer.buyerId),
    p = s.products.find((p) => p.id === offer.productId),
    session = s.bot?.sessions[phone];
  return (
    !!b &&
    !!p &&
    offer.status === "ready" &&
    session?.role === "customer" &&
    session.buyerId === b.id &&
    session.optIn === true &&
    !session.optedOut &&
    !session.simulation &&
    b.autoUpdates === true &&
    !b.suppressed &&
    now - Date.parse(session.lastInbound) >= 0 &&
    now - Date.parse(session.lastInbound) < 24 * 60 * 60 * 1000 &&
    JSON.stringify(p) === offer.productSnapshot &&
    matchBuyer(p, b).eligible &&
    createMessage(p, b, {
      channel: "whatsapp",
      language: b.language || "en",
    }) === offer.body
  );
}

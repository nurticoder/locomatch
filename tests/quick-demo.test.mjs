import test from "node:test";
import assert from "node:assert/strict";
import { demoStock } from "../public/quick-demo.js";
import { seedState, matchBuyer, productIssues, createMessage } from "../public/domain.js";
import { canAutoSend, prepareAutomaticOffers, promotionFor } from "../server/bot.mjs";

test("ready-made samples save complete facts and demonstrate quantity-dependent matches", () => {
  const s = seedState();
  for (const [choice, quantity, count] of [["small", 40, 2], ["large", 120, 4]]) {
    const p = demoStock(choice);
    assert.equal(p.quantity, quantity);
    assert.deepEqual(productIssues(p), []);
    assert.equal(s.buyers.filter((b) => matchBuyer(p, b).eligible).length, count);
    assert.match(createMessage(p, s.buyers[0], { channel: "whatsapp", language: "en" }), /38/);
  }
});

test("quick demo offers cannot be sent automatically or included in live bot replies", () => {
  const before = seedState(), s = structuredClone(before), p = demoStock();
  s.buyers[0].autoUpdates = true;
  s.products = [p];
  prepareAutomaticOffers(before, s);
  assert.equal(s.bot.outbox.length, 2);
  const offer = s.bot.outbox[0], b = s.buyers.find((b) => b.id === offer.buyerId);
  s.bot.sessions = { "+85250000000": { role: "customer", buyerId: b.id, optIn: true, lastInbound: new Date().toISOString() } };
  assert.equal(canAutoSend(s, offer, "+85250000000"), false);
  // All ordinary sending requirements pass once the sample-only flag is removed.
  p.demoOnly = false;
  offer.productSnapshot = JSON.stringify(p);
  assert.equal(canAutoSend(s, offer, "+85250000000"), true);
  p.demoOnly = true;
  assert.match(promotionFor(s, b, "en"), /no verified products/);
  assert.match(promotionFor(s, b, "en", true), /orange marmalade/i);
});

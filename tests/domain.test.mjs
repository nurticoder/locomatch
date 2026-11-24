import test from "node:test";
import assert from "node:assert/strict";
import {
  seedState,
  today,
  addDays,
  matchBuyer,
  productIssues,
  createMessage,
  parseCSV,
  csvCell,
} from "../dist/domain.js";
const setup = () => {
  const s = seedState();
  return { s, p: s.products[0], b: s.buyers[0] };
};
test("seeded orange batch matches four authorised compatible buyers", () => {
  const { s, p } = setup();
  assert.deepEqual(
    s.buyers.filter((b) => matchBuyer(p, b).eligible).map((b) => b.id),
    ["b1", "b2", "b3", "b4"],
  );
});
test("all seeded buyer exclusions have explicit failed checks", () => {
  const { s, p } = setup();
  const expected = {
    b5: "price",
    b6: "quantity",
    b7: "category",
    b8: "shelf",
    b9: "authorisation",
    b10: "authorisation",
  };
  for (const [id, key] of Object.entries(expected)) {
    const m = matchBuyer(
      p,
      s.buyers.find((b) => b.id === id),
    );
    assert.equal(m.eligible, false);
    assert(m.failed.some((c) => c.key === key));
  }
});
test("missing or unapproved data cannot match", () => {
  for (const patch of [
    { status: "pending" },
    { reviewer: "" },
    { confirmed: false },
    { price: "" },
    { quantity: 0 },
    { source: "" },
    { delivery: "" },
    { districts: [] },
    { expiry: addDays(today(), -1) },
    { available: "not-a-date" },
    { storage: "" },
  ]) {
    const { p, b } = setup();
    Object.assign(p, patch);
    assert.equal(matchBuyer(p, b).eligible, false, JSON.stringify(patch));
  }
});
test("stock and price boundary values are inclusive", () => {
  const { p, b } = setup();
  p.quantity = b.quantity;
  p.price = b.maxPrice;
  assert(matchBuyer(p, b).eligible);
  p.quantity--;
  assert(!matchBuyer(p, b).eligible);
  p.quantity++;
  p.price += 0.01;
  assert(!matchBuyer(p, b).eligible);
});
test("shelf life is evaluated at buyer delivery date", () => {
  const { p, b } = setup();
  p.expiry = addDays(today(), b.leadDays + b.minShelfDays);
  assert(matchBuyer(p, b).eligible);
  p.expiry = addDays(p.expiry, -1);
  assert(!matchBuyer(p, b).eligible);
});
test("availability, lead time and district must all fit", () => {
  for (const patch of [
    { available: addDays(today(), 6) },
    { leadDays: 6 },
    { districts: ["Kowloon"] },
  ]) {
    const { p, b } = setup();
    Object.assign(p, patch);
    assert(!matchBuyer(p, b).eligible);
  }
});
test("chilled products require buyer storage compatibility", () => {
  const { p, b } = setup();
  p.storage = "Chilled";
  assert(!matchBuyer(p, b).eligible);
  b.storage.push("Chilled");
  assert(matchBuyer(p, b).eligible);
});
test("opt out always takes precedence over authorisation", () => {
  const { p, b } = setup();
  b.suppressed = true;
  b.authorised = true;
  assert(!matchBuyer(p, b).eligible);
});
test("estimated harvest and incomplete roselle remain blocked", () => {
  const { s } = setup();
  for (const p of [s.products[1], s.products[3]]) {
    assert(productIssues(p).length);
    assert(s.buyers.every((b) => !matchBuyer(p, b).eligible));
  }
});
test("a valid verified record has no issues", () => {
  const { p } = setup();
  assert.deepEqual(productIssues(p), []);
});
test("invalid dates, decimals and negative lead time are rejected", () => {
  for (const patch of [
    { expiry: "2026-02-30" },
    { quantity: 2.5 },
    { price: -1 },
    { leadDays: -1 },
    { available: addDays(today(), 200) },
  ]) {
    const { p } = setup();
    Object.assign(p, patch);
    assert(productIssues(p).length);
  }
});
test("email uses verified facts and does not invent benefits", () => {
  const { p, b } = setup();
  const text = createMessage(p, b);
  for (const fact of [
    p.name.toLowerCase(),
    String(b.quantity),
    String(p.price),
    p.expiry,
    p.delivery,
  ])
    assert(text.includes(fact));
  assert(text.startsWith("Subject:"));
  assert(!/carbon|organic|certified|guarantee/i.test(text));
});
test("Traditional Chinese WhatsApp draft uses no email subject", () => {
  const { p, b } = setup();
  const text = createMessage(p, b, { language: "zh", channel: "whatsapp" });
  assert(text.includes(p.nameZh));
  assert(text.includes("HK$1368"));
  assert(!text.startsWith("主旨"));
});
test("draft generation rejects ineligible buyer or excessive quantity", () => {
  const { s, p, b } = setup();
  assert.throws(() => createMessage(p, s.buyers[4]));
  assert.throws(() => createMessage(p, b, { quantity: 121 }));
  assert.throws(() => createMessage(p, b, { quantity: 37 }));
  assert.throws(() => createMessage(p, b, { quantity: 1.5 }));
});
const csv =
  'name,quantity,price,available,expiry,storage,districts,delivery,source\n"Orange, local",40,38,2026-11-24,2027-04-01,Ambient,Hong Kong Island,"Delivery, included","Sheet ""A"""';
test("CSV parses quoted commas and escaped quotation marks", () => {
  const [p] = parseCSV(csv);
  assert.equal(p.name, "Orange, local");
  assert.equal(p.source, 'Sheet "A"');
  assert.equal(p.quantity, 40);
  assert.equal(p.status, "pending");
  assert.equal(p.confirmed, false);
  assert.equal(p.reviewer, "");
});
test("CSV import never carries approval or arbitrary fields", () => {
  const input =
    csv.replace("source\n", "source,status,confirmed\n") + ",verified,true";
  const [p] = parseCSV(input);
  assert.equal(p.status, "pending");
  assert.equal(p.confirmed, false);
});
test("CSV supports BOM, CRLF, multiline fields and defaults", () => {
  const [p] = parseCSV(
    "\uFEFF" +
      csv
        .replaceAll("\n", "\r\n")
        .replace("Delivery, included", "Delivery\nwith notice"),
  );
  assert.equal(p.delivery, "Delivery\nwith notice");
  assert.equal(p.leadDays, 3);
});
test("CSV validates headers, row lengths, quoting and batch limit", () => {
  assert.throws(() => parseCSV("name\na"));
  assert.throws(() => parseCSV(csv + '"'));
  assert.throws(() => parseCSV(csv + ",extra"));
  const rows = csv.split("\n");
  assert.throws(() =>
    parseCSV(rows[0] + "\n" + Array(101).fill(rows[1]).join("\n")),
  );
});
test("CSV export neutralises spreadsheet formula injection", () => {
  for (const value of [
    "=1+1",
    "+SUM(1)",
    "-1",
    "@IMPORT",
    "\tcommand",
    "  =1+1",
    "\n=1+1",
  ])
    assert(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('a"b'), '"a""b"');
});

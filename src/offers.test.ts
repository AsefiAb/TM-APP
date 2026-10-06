import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfferMessage,
  emptyOfferDraft,
  getOfferExample,
  OfferDraft,
} from "./offers";
import { withOptOut } from "./sam";

const NOW = new Date(2026, 9, 6, 12);

function offer(overrides: Partial<OfferDraft> = {}): OfferDraft {
  return {
    ...emptyOfferDraft(),
    businessName: "North Studio",
    kind: "percent",
    value: "20",
    appliesTo: "next visit",
    expiresOn: "10/13/2026",
    ...overrides,
  };
}

test("offer drafts start blank and examples require an explicit preset", () => {
  const blank = emptyOfferDraft();
  assert.deepEqual(blank, {
    businessName: "",
    kind: "percent",
    value: "",
    appliesTo: "",
    expiresOn: "",
    terms: "",
    redemptionMethod: "in-person",
    checkoutCode: "",
    checkoutUrl: "",
    checkoutReady: false,
  });
  blank.value = "40";
  assert.equal(emptyOfferDraft().value, "");
  assert.throws(
    () => buildOfferMessage(emptyOfferDraft(), NOW),
    /business name/,
  );
  for (const preset of ["percent", "amount", "custom"] as const) {
    const example = getOfferExample(preset, NOW);
    assert.deepEqual(Object.keys(example).sort(), [
      "appliesTo",
      "expiresOn",
      "kind",
      "terms",
      "value",
    ]);
    assert.equal(example.kind, preset);
    assert.equal(
      example.value,
      preset === "percent" ? "20" : preset === "amount" ? "10" : "free add-on",
    );
    assert.equal(
      example.appliesTo,
      preset === "amount" ? "a purchase" : "next visit",
    );
    assert.equal(example.expiresOn, "10/13/2026");
    assert.equal(example.terms, "One per customer.");
  }
  assert.equal(
    getOfferExample("percent", new Date(2026, 11, 28, 23)).expiresOn,
    "01/04/2027",
  );
  assert.equal(NOW.getDate(), 6);
});

test("offer wording uses supplied facts without adding terms, codes, or security promises", () => {
  const draft = offer();
  const snapshot = structuredClone(draft);
  const message = buildOfferMessage(draft, NOW);
  assert.equal(
    message,
    "North Studio: Enjoy 20% off your next visit. Valid through October 13, 2026. Ask our team to verify this offer before checkout.",
  );
  assert.doesNotMatch(
    message,
    /STOP|one per|single.use|unique|secure|guarantee|coupon code/i,
  );
  assert.deepEqual(draft, snapshot);
  const terms = "Members only.\nCannot be combined with other offers!";
  assert.ok(buildOfferMessage(offer({ terms }), NOW).endsWith(terms));
  assert.match(
    buildOfferMessage(
      offer({ kind: "amount", value: "10.50", appliesTo: "a purchase" }),
      NOW,
    ),
    /Enjoy \$10\.50 off a purchase\./,
  );
  assert.match(
    buildOfferMessage(offer({ kind: "custom", value: "free add-on" }), NOW),
    /Offer: free add-on\. Applies to your next visit\./,
  );
});

test("offer benefits and scope reject missing, out-of-range, or imprecise inputs", () => {
  for (const value of [
    "",
    " ",
    "0",
    "-1",
    "100.01",
    "20%",
    "2e1",
    "NaN",
    "1.001",
    "1,000",
  ]) {
    assert.throws(() => buildOfferMessage(offer({ value }), NOW), /percentage/);
  }
  for (const value of [
    "",
    "0",
    "-5",
    "$10",
    "1.001",
    "Infinity",
    "1e3",
    "99999999999999999",
  ]) {
    assert.throws(
      () => buildOfferMessage(offer({ kind: "amount", value }), NOW),
      /dollar amount/,
    );
  }
  assert.match(buildOfferMessage(offer({ value: "100.00" }), NOW), /100% off/);
  assert.match(buildOfferMessage(offer({ value: ".5" }), NOW), /0\.5% off/);
  assert.match(
    buildOfferMessage(offer({ kind: "amount", value: "0.01" }), NOW),
    /\$0\.01 off/,
  );
  assert.throws(
    () => buildOfferMessage(offer({ appliesTo: "\n " }), NOW),
    /applies to/,
  );
  assert.throws(
    () => buildOfferMessage(offer({ kind: "custom", value: " " }), NOW),
    /Describe the offer/,
  );
});

test("expiry uses real local calendar dates and the end of the chosen day", () => {
  for (const expiresOn of [
    "",
    "2026-10-13",
    "2/29/2028",
    "02/29/2026",
    "04/31/2027",
    "00/10/2027",
    "13/01/2027",
    "10/00/2027",
    "10/13/26",
  ]) {
    assert.throws(
      () => buildOfferMessage(offer({ expiresOn }), NOW),
      /date|MM\/DD\/YYYY/,
    );
  }
  assert.throws(
    () => buildOfferMessage(offer({ expiresOn: "10/05/2026" }), NOW),
    /today or a future date/,
  );
  assert.match(
    buildOfferMessage(offer({ expiresOn: "10/06/2026" }), NOW),
    /October 6, 2026/,
  );
  assert.throws(
    () =>
      buildOfferMessage(
        offer({ expiresOn: "10/06/2026" }),
        new Date(2026, 9, 7),
      ),
    /today or a future date/,
  );
  assert.match(
    buildOfferMessage(offer({ expiresOn: "02/29/2028" }), NOW),
    /February 29, 2028/,
  );
  assert.throws(() => buildOfferMessage(offer(), new Date(NaN)), /device date/);
});

test("online redemption requires the owner's existing checkout configuration", () => {
  const online = offer({
    redemptionMethod: "online",
    checkoutUrl: "https://shop.example/checkout",
    checkoutCode: "SAVE_20-now",
    checkoutReady: true,
  });
  assert.match(
    buildOfferMessage(online, NOW),
    /Shop https:\/\/shop\.example\/checkout and use code SAVE_20-now at checkout\./,
  );
  assert.throws(
    () => buildOfferMessage({ ...online, checkoutReady: false }, NOW),
    /Confirm/,
  );
  for (const checkoutCode of [
    "",
    " ",
    "A",
    "a".repeat(33),
    "SAVE 20",
    "SAVE!",
    "é20",
  ]) {
    assert.throws(
      () => buildOfferMessage({ ...online, checkoutCode }, NOW),
      /code/,
    );
  }
  for (const checkoutUrl of [
    "",
    "http://shop.example",
    "javascript:alert(1)",
    "not a url",
    "https://owner:secret@shop.example",
    "https://owner@shop.example",
    "https://shop.example/\ncheckout",
    "https://shop.example/a b",
  ]) {
    assert.throws(
      () => buildOfferMessage({ ...online, checkoutUrl }, NOW),
      /HTTPS checkout link/,
    );
  }
  assert.doesNotMatch(
    buildOfferMessage(online, NOW),
    /unique|secure|single.use|one per|verified|guarantee/i,
  );
  assert.doesNotMatch(
    buildOfferMessage({ ...online, redemptionMethod: "in-person" }, NOW),
    /SAVE_20-now|shop\.example/,
  );
});

test("offer length reserves the full opt-out footer and never truncates owner terms", () => {
  const baseline = buildOfferMessage(offer(), NOW);
  const termsLength = 1600 - withOptOut(baseline).length - 1;
  const terms = "x".repeat(termsLength);
  const message = buildOfferMessage(offer({ terms }), NOW);
  assert.equal(withOptOut(message).length, 1600);
  assert.ok(message.endsWith(terms));
  assert.throws(
    () => buildOfferMessage(offer({ terms: `${terms}x` }), NOW),
    /1,600/,
  );
});

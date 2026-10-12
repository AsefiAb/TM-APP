import assert from "node:assert/strict";
import test from "node:test";
import {
  IDEAS,
  estimateImpact,
  formatMoney,
  getIdea,
  ideasForIndustry,
  suggestedSendTime,
} from "./ideas";
import { getSmsInfo } from "./domain";
import { withOptOut } from "./sam";

test("every idea produces a one-segment GSM message with the business name and fits the limit", () => {
  for (const idea of IDEAS) {
    const body = withOptOut(idea.message("Oak Street Coffee", idea.defaultValue));
    assert.ok(body.startsWith("Oak Street Coffee:"), idea.id);
    const sms = getSmsInfo(body);
    assert.equal(sms.encoding, "GSM-7", idea.id);
    assert.ok(sms.segments <= 2, `${idea.id} uses ${sms.segments} segments`);
    assert.ok(idea.why.length >= 2, idea.id);
    assert.ok(idea.defaults.redemptionRate > 0 && idea.defaults.redemptionRate <= 0.2, idea.id);
  }
  assert.equal(new Set(IDEAS.map((idea) => idea.id)).size, IDEAS.length);
});

test("ideas are ordered industry-specific first and generic ideas are never duplicated", () => {
  const restaurant = ideasForIndustry("Restaurant");
  assert.equal(restaurant[0].id, "slow-day");
  assert.ok(restaurant.some((idea) => idea.id === "today-only"));
  assert.equal(new Set(restaurant.map((idea) => idea.id)).size, restaurant.length);
  const unknown = ideasForIndustry("Something new");
  assert.ok(unknown.length >= 2);
  assert.ok(unknown.every((idea) => idea.industries.includes("*")));
  assert.equal(getIdea("missing"), undefined);
});

test("impact estimates follow the stated arithmetic and reject bad inputs", () => {
  const impact = estimateImpact({
    recipients: 200,
    segments: 1,
    estimate: { redemptionRate: 0.05, averageTicket: 18, costPerMessage: 0.035 },
  });
  assert.deepEqual(impact, {
    reached: 196,
    redemptions: 10,
    revenue: 180,
    messageCost: 7,
    net: 173,
  });
  assert.equal(
    estimateImpact({ recipients: 0, segments: 1, estimate: { redemptionRate: 0.05, averageTicket: 18, costPerMessage: 0.035 } }).net,
    0,
  );
  assert.throws(
    () => estimateImpact({ recipients: 10, segments: 1, estimate: { redemptionRate: 1.5, averageTicket: 1, costPerMessage: 0 } }),
    /100%/,
  );
  assert.throws(
    () => estimateImpact({ recipients: -1, segments: 1, estimate: { redemptionRate: 0.1, averageTicket: 1, costPerMessage: 0 } }),
    /subscribers/,
  );
  assert.throws(
    () => estimateImpact({ recipients: 1, segments: 1, estimate: { redemptionRate: 0.1, averageTicket: Number.NaN, costPerMessage: 0 } }),
    /average sale/,
  );
});

test("suggested send time is today before the cutoff and tomorrow after it", () => {
  const idea = getIdea("slow-day")!;
  const morning = new Date(2026, 9, 12, 8, 0);
  const today = suggestedSendTime(idea, morning);
  assert.deepEqual([today.getDate(), today.getHours(), today.getMinutes()], [12, 11, 0]);
  const evening = new Date(2026, 9, 12, 16, 0);
  const tomorrow = suggestedSendTime(idea, evening);
  assert.deepEqual([tomorrow.getDate(), tomorrow.getHours()], [13, 11]);
  const justAfterSlot = new Date(2026, 9, 12, 11, 30);
  assert.equal(suggestedSendTime(idea, justAfterSlot).getDate(), 13);
});

test("money formatting is readable at small and large amounts", () => {
  assert.equal(formatMoney(0), "$0");
  assert.equal(formatMoney(7), "$7");
  assert.equal(formatMoney(3.5), "$3.50");
  assert.equal(formatMoney(1234.4), "$1,234");
});

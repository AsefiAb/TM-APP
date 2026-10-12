import assert from "node:assert/strict";
import test from "node:test";
import {
  AppData,
  DEFAULT_GROUPS,
  addContact,
  createCampaign,
  isAppData,
  markCampaignSent,
  recordCampaignResults,
} from "./domain";
import { campaignToSeed, saveCampaign } from "./sam";

function workspace(): AppData {
  const empty: AppData = {
    version: 1,
    groups: [...DEFAULT_GROUPS],
    contacts: [],
    conversations: [],
    campaigns: [],
  };
  return addContact(empty, {
    name: "Sarah Lee",
    phone: "925 555 0182",
    group: "VIP",
    consentConfirmed: true,
  });
}

const estimate = { redemptionRate: 0.06, averageTicket: 18, costPerMessage: 0.035 };

test("campaigns keep their idea and projection inputs and validate them", () => {
  const data = createCampaign(workspace(), {
    name: "Slow-day special",
    body: "Oak Street Coffee: 20% off breadsticks today only.",
    audience: "VIP",
    ideaId: "slow-day",
    estimate,
  });
  assert.equal(data.campaigns[0].ideaId, "slow-day");
  assert.deepEqual(data.campaigns[0].estimate, estimate);
  assert.equal(isAppData(data), true);
  assert.throws(
    () =>
      createCampaign(workspace(), {
        name: "x",
        body: "y",
        audience: "VIP",
        estimate: { ...estimate, redemptionRate: 2 },
      }),
    /projection/,
  );
  const seed = campaignToSeed(data.campaigns[0]);
  assert.equal(seed.ideaId, "slow-day");
  assert.deepEqual(seed.estimate, estimate);
  const revised = saveCampaign(data, {
    id: data.campaigns[0].id,
    name: "Slow-day special",
    body: data.campaigns[0].body,
    audience: "VIP",
    ideaId: "slow-day",
    estimate,
  });
  assert.equal(revised.campaigns[0].id, data.campaigns[0].id);
  assert.equal(revised.campaigns[0].estimate?.averageTicket, 18);
});

test("marking a campaign sent records the time, recounts recipients, and clears the schedule", () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const data = createCampaign(workspace(), {
    name: "Tonight",
    body: "Dinner tonight?",
    audience: "VIP",
    scheduledAt: future,
  });
  const sentAt = new Date("2026-10-12T18:00:00.000Z");
  const sent = markCampaignSent(data, data.campaigns[0].id, sentAt);
  assert.equal(sent.campaigns[0].status, "sent");
  assert.equal(sent.campaigns[0].sentAt, sentAt.toISOString());
  assert.equal(sent.campaigns[0].scheduledAt, undefined);
  assert.equal(sent.campaigns[0].recipients, 1);
  assert.equal(data.campaigns[0].status, "scheduled", "original is untouched");
  assert.equal(isAppData(sent), true);
  assert.throws(() => markCampaignSent(sent, sent.campaigns[0].id), /already/);
  assert.throws(() => markCampaignSent(sent, "missing"), /could not be found/);
});

test("results can only be logged for sent campaigns and are validated", () => {
  const data = createCampaign(workspace(), {
    name: "Flash sale",
    body: "Flash sale today!",
    audience: "VIP",
    estimate,
  });
  const id = data.campaigns[0].id;
  assert.throws(
    () => recordCampaignResults(data, id, { redemptions: 3, revenue: 54 }),
    /Mark the campaign as sent/,
  );
  const sent = markCampaignSent(data, id);
  const logged = recordCampaignResults(
    sent,
    id,
    { redemptions: 3, revenue: 54.456, note: "  Busy afternoon  " },
    new Date("2026-10-13T09:00:00.000Z"),
  );
  assert.deepEqual(logged.campaigns[0].results, {
    redemptions: 3,
    revenue: 54.46,
    note: "Busy afternoon",
    recordedAt: "2026-10-13T09:00:00.000Z",
  });
  assert.equal(isAppData(logged), true);
  assert.throws(() => recordCampaignResults(sent, id, { redemptions: 1.5, revenue: 1 }), /whole number/);
  assert.throws(() => recordCampaignResults(sent, id, { redemptions: 1, revenue: -1 }), /dollar amount/);
  const corrupt = { ...logged, campaigns: [{ ...logged.campaigns[0], status: "draft" as const }] };
  assert.equal(isAppData(corrupt), false, "results on an unsent campaign are rejected");
});

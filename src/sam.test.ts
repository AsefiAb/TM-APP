import assert from "node:assert/strict";
import test from "node:test";
import { createSeedData, getSmsInfo, isAppData } from "./domain";
import {
  campaignToSeed,
  campaignTitle,
  defaultGuide,
  goals,
  isGuideProgress,
  saveCampaign,
  suggestMessage,
  withOptOut,
  WriterTone,
} from "./sam";

test("offline writing preserves supplied details without inventing an offer or deadline", () => {
  const details =
    "Our new evening class is open for registration. Reply CLASS for details.";
  for (const goal of goals) {
    for (const tone of ["friendly", "concise", "energetic"] as WriterTone[]) {
      const message = suggestMessage({
        goal: goal.id,
        tone,
        details,
        businessName: "North Studio",
      });
      assert.ok(message.startsWith("North Studio:"));
      assert.ok(message.endsWith(details));
      assert.doesNotMatch(
        message,
        /\d|%|free|discount|today|tomorrow|limited|expires/i,
      );
      assert.equal(
        message,
        suggestMessage({
          goal: goal.id,
          tone,
          details,
          businessName: "North Studio",
        }),
      );
    }
  }
  assert.equal(
    suggestMessage({
      goal: "promotion",
      tone: "concise",
      details: "  15% off through October 18.  ",
    }),
    "15% off through October 18.",
  );
  assert.throws(
    () => suggestMessage({ goal: "update", tone: "friendly", details: "\n " }),
    /details/,
  );
});

test("opt-out footer is added once, preserves existing wording, and handles empty messages", () => {
  assert.equal(withOptOut(" \n "), "");
  assert.equal(withOptOut(" Hello! "), "Hello!\nReply STOP to opt out.");
  assert.equal(
    withOptOut(withOptOut("Hello!")),
    "Hello!\nReply STOP to opt out.",
  );
  for (const message of [
    "Hello. reply stop to opt out.",
    "Hello. REPLY STOP TO OPT OUT",
    "Hello. Reply  STOP\nto opt out.",
  ]) {
    assert.equal(withOptOut(message), message);
  }
});

test("segment counting reflects the complete assisted message including the footer", () => {
  const text = "a".repeat(140);
  assert.equal(getSmsInfo(text).segments, 1);
  assert.equal(getSmsInfo(withOptOut(text)).segments, 2);
  const emojiText = "🙂".repeat(25);
  assert.equal(getSmsInfo(emojiText).segments, 1);
  assert.equal(getSmsInfo(withOptOut(emojiText)).segments, 2);
});

test("suggested campaign titles stay within 60 characters without splitting Unicode", () => {
  assert.equal(
    campaignTitle("  New classes\nnow available.  "),
    "New classes now available.",
  );
  assert.equal(campaignTitle("Reply STOP to opt out."), "New campaign");
  assert.equal(campaignTitle(withOptOut("New classes")), "New classes");
  const title = campaignTitle("🙂".repeat(50));
  assert.ok(title.length <= 60);
  assert.ok(title.endsWith("..."));
  assert.equal(title.replaceAll("🙂", ""), "...");
});

test("reusing a campaign copies editable content without its identity or delivery history", () => {
  const original = createSeedData().campaigns[0];
  const snapshot = structuredClone(original);
  const seed = campaignToSeed(original);
  assert.deepEqual(seed, {
    name: `${original.name} (copy)`,
    body: original.body,
    audience: original.audience,
  });
  seed.name = "A revised offer";
  seed.body = "A different message.";
  seed.audience = "Members";
  assert.deepEqual(original, snapshot);
});

test("copied names keep their suffix within 80 UTF-16 units without splitting code points", () => {
  const original = createSeedData().campaigns[0];
  for (const [name, expected] of [
    ["a".repeat(80), `${"a".repeat(73)} (copy)`],
    ["🙂".repeat(40), `${"🙂".repeat(36)} (copy)`],
    [`${"a".repeat(72)}🙂more`, `${"a".repeat(72)} (copy)`],
  ]) {
    const seed = campaignToSeed({ ...original, name });
    assert.equal(seed.name, expected);
    assert.ok(seed.name.length <= 80);
    assert.ok(seed.name.endsWith(" (copy)"));
  }
});

test("reusing sent and scheduled campaigns saves independent drafts with no inherited schedule or metrics", () => {
  const sentData = createSeedData();
  const scheduledData = saveCampaign(createSeedData(), {
    name: "An upcoming update",
    body: "New classes are available.",
    audience: "Members",
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  for (const data of [sentData, scheduledData]) {
    const source = data.campaigns[0];
    const snapshot = structuredClone(data);
    const updated = saveCampaign(data, campaignToSeed(source));
    const copy = updated.campaigns[0];
    assert.notEqual(copy.id, source.id);
    assert.equal(copy.status, "draft");
    assert.equal(copy.body, source.body);
    assert.equal(copy.audience, source.audience);
    assert.equal(copy.name, `${source.name} (copy)`);
    for (const key of ["scheduledAt", "delivered", "replies"]) {
      assert.equal(Object.hasOwn(copy, key), false);
    }
    assert.equal(updated.campaigns.length, data.campaigns.length + 1);
    assert.equal(updated.campaigns[1], source);
    assert.deepEqual(data, snapshot);
    assert.equal(isAppData(updated), true);
  }
});

test("reused drafts recalculate subscribed recipients instead of copying stale campaign counts", () => {
  const data = createSeedData();
  const source = data.campaigns[0];
  source.recipients = 999;
  data.contacts[0].consent = "unsubscribed";
  const snapshot = structuredClone(data);
  const updated = saveCampaign(data, campaignToSeed(source));
  assert.equal(updated.campaigns[0].recipients, 2);
  assert.equal(source.recipients, 999);
  assert.deepEqual(data, snapshot);
  assert.equal(isAppData(updated), true);
});

test("editing a draft preserves its identity and order without creating duplicates", () => {
  const data = createSeedData();
  const original = data.campaigns[2];
  const updated = saveCampaign(data, {
    id: original.id,
    name: "Revised invitation",
    body: withOptOut("North Studio: New classes are available."),
    audience: "VIP",
  });
  assert.equal(updated.campaigns.length, data.campaigns.length);
  assert.equal(updated.campaigns[2].id, original.id);
  assert.equal(updated.campaigns[2].name, "Revised invitation");
  assert.equal(updated.campaigns[2].status, "draft");
  assert.equal(updated.campaigns[2].recipients, 3);
  assert.equal(
    updated.campaigns.filter((item) => item.id === original.id).length,
    1,
  );
  assert.equal(data.campaigns[2], original);
  assert.notEqual(data.campaigns[2].name, updated.campaigns[2].name);
  assert.equal(updated.campaigns[0], data.campaigns[0]);
  assert.equal(isAppData(updated), true);
});

test("new and edited campaigns use current consent and existing domain validation", () => {
  const data = createSeedData();
  data.contacts[0].consent = "unsubscribed";
  const input = {
    name: "An update",
    body: "New classes are available.",
    audience: "VIP" as const,
  };
  const created = saveCampaign(data, input);
  assert.equal(created.campaigns.length, data.campaigns.length + 1);
  assert.equal(created.campaigns[0].recipients, 2);
  const updated = saveCampaign(data, { ...input, id: "campaign-3" });
  assert.equal(updated.campaigns[2].recipients, 2);
  assert.throws(
    () => saveCampaign(data, { ...input, id: "campaign-3", body: " " }),
    /message/,
  );
  assert.throws(
    () => saveCampaign(data, { ...input, id: "campaign-3", name: " " }),
    /name/,
  );
  data.contacts
    .filter((contact) => contact.group === "VIP")
    .forEach((contact) => {
      contact.consent = "unsubscribed";
    });
  assert.throws(
    () => saveCampaign(data, { ...input, id: "campaign-3" }),
    /no subscribed contacts/,
  );
});

test("scheduled demo campaigns can be revised or returned to a draft", () => {
  const data = createSeedData();
  const input = {
    id: "campaign-3",
    name: "New classes",
    body: "Registration is open.",
    audience: "Members" as const,
  };
  const scheduledAt = new Date(Date.now() + 86_400_000).toISOString();
  const scheduled = saveCampaign(data, { ...input, scheduledAt });
  assert.equal(scheduled.campaigns[2].status, "scheduled");
  assert.equal(scheduled.campaigns[2].scheduledAt, scheduledAt);
  const revised = saveCampaign(scheduled, {
    ...input,
    name: "Updated classes",
    scheduledAt,
  });
  assert.equal(revised.campaigns[2].name, "Updated classes");
  assert.equal(revised.campaigns[2].id, input.id);
  assert.equal(revised.campaigns.length, data.campaigns.length);
  const draft = saveCampaign(revised, input);
  assert.equal(draft.campaigns[2].status, "draft");
  assert.equal(draft.campaigns[2].scheduledAt, undefined);
  assert.throws(
    () =>
      saveCampaign(draft, { ...input, scheduledAt: "2020-01-01T12:00:00Z" }),
    /future/,
  );
});

test("empty-audience draft creation and editing require explicit opt-in on every save", () => {
  const data = {
    ...createSeedData(),
    contacts: [],
    conversations: [],
    campaigns: [],
  };
  const input = {
    name: "Our first offer",
    body: "Your business: A new offer is coming soon.",
    audience: "All subscribers" as const,
    allowEmptyDraft: true,
  };
  const created = saveCampaign(data, input);
  const id = created.campaigns[0].id;
  const edited = saveCampaign(created, {
    ...input,
    id,
    name: "Our welcome offer",
  });
  assert.equal(edited.campaigns.length, 1);
  assert.equal(edited.campaigns[0].id, id);
  assert.equal(edited.campaigns[0].name, "Our welcome offer");
  assert.equal(edited.campaigns[0].recipients, 0);
  assert.equal(edited.campaigns[0].status, "draft");
  assert.equal(isAppData(edited), true);
  assert.throws(
    () => saveCampaign(created, { ...input, id, allowEmptyDraft: undefined }),
    /no subscribed contacts/,
  );
  assert.throws(
    () =>
      saveCampaign(created, {
        ...input,
        id,
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    /no subscribed contacts/,
  );
  assert.equal(created.campaigns[0].status, "draft");
  assert.equal(created.campaigns[0].name, input.name);
});

test("sent campaigns and missing campaign IDs cannot be edited", () => {
  const data = createSeedData();
  const input = {
    name: "Changed",
    body: "New information.",
    audience: "VIP" as const,
  };
  assert.throws(
    () => saveCampaign(data, { ...input, id: "campaign-1" }),
    /Sent campaigns/,
  );
  assert.throws(
    () => saveCampaign(data, { ...input, id: "missing" }),
    /could not be found/,
  );
  assert.equal(data.campaigns[0].status, "sent");
  assert.equal(data.campaigns.length, 4);
});

test("guide progress supports persisted dismissal and rejects malformed saved state", () => {
  assert.equal(isGuideProgress(defaultGuide), true);
  const persisted: unknown = JSON.parse(
    JSON.stringify({
      hidden: true,
      completed: ["writer", "campaign", "reply"],
    }),
  );
  assert.equal(isGuideProgress(persisted), true);
  for (const invalid of [
    null,
    [],
    {},
    { hidden: "yes", completed: [] },
    { hidden: false, completed: [1] },
    { hidden: false, completed: [""] },
    { hidden: false, completed: ["writer", "writer"] },
    { hidden: false, completed: ["unknown"] },
  ]) {
    assert.equal(isGuideProgress(invalid), false);
  }
  assert.deepEqual(defaultGuide, { hidden: false, completed: [] });
});

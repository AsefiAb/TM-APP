import assert from "node:assert/strict";
import test from "node:test";
import {
  createCampaign,
  createSeedData,
  getAudienceContacts,
  getSmsInfo,
  isAppData,
  markConversationRead,
  replyToConversation,
} from "./domain";

test("seed data is complete, valid, fictional, and fresh on every call", () => {
  const data = createSeedData();
  assert.equal(data.contacts.length, 12);
  assert.equal(data.conversations.length, 5);
  assert.equal(data.campaigns.length, 4);
  assert.equal(isAppData(data), true);
  data.contacts[0].name = "Changed locally";
  assert.equal(createSeedData().contacts[0].name, "Olivia Bennett");
});

test("audiences always exclude unsubscribed contacts", () => {
  const { contacts } = createSeedData();
  assert.equal(getAudienceContacts(contacts, "All subscribers").length, 10);
  assert.equal(getAudienceContacts(contacts, "Leads").length, 2);
  const selected = getAudienceContacts(contacts, "VIP");
  assert.equal(selected.length, 3);
  assert.ok(
    selected.every(
      (contact) => contact.group === "VIP" && contact.consent === "subscribed",
    ),
  );
});

test("GSM SMS boundaries use the concatenated message capacity", () => {
  assert.deepEqual(getSmsInfo(""), {
    encoding: "GSM-7",
    characters: 0,
    segments: 0,
  });
  assert.deepEqual(getSmsInfo("a".repeat(160)), {
    encoding: "GSM-7",
    characters: 160,
    segments: 1,
  });
  assert.equal(getSmsInfo("a".repeat(161)).segments, 2);
  assert.equal(getSmsInfo("a".repeat(306)).segments, 2);
  assert.equal(getSmsInfo("a".repeat(307)).segments, 3);
});

test("GSM extension characters cost two septets and are never split", () => {
  assert.deepEqual(getSmsInfo("^{}\\[~]|€\f"), {
    encoding: "GSM-7",
    characters: 20,
    segments: 1,
  });
  assert.equal(getSmsInfo("^".repeat(80)).segments, 1);
  assert.equal(getSmsInfo("^".repeat(81)).segments, 2);
  assert.equal(getSmsInfo("^".repeat(153)).segments, 3);
  assert.equal(getSmsInfo("a".repeat(152) + "^" + "a".repeat(152)).segments, 3);
});

test("Unicode switches the entire message to UTF-16 accounting", () => {
  assert.deepEqual(getSmsInfo("漢".repeat(70)), {
    encoding: "Unicode",
    characters: 70,
    segments: 1,
  });
  assert.equal(getSmsInfo("漢".repeat(71)).segments, 2);
  assert.equal(getSmsInfo("漢".repeat(134)).segments, 2);
  assert.equal(getSmsInfo("漢".repeat(135)).segments, 3);
  assert.deepEqual(getSmsInfo("🙂".repeat(35)), {
    encoding: "Unicode",
    characters: 70,
    segments: 1,
  });
  assert.equal(getSmsInfo("🙂".repeat(36)).segments, 2);
  assert.equal(getSmsInfo("🙂".repeat(67)).segments, 3);
  assert.deepEqual(getSmsInfo("^🙂"), {
    encoding: "Unicode",
    characters: 3,
    segments: 1,
  });
  assert.equal(getSmsInfo("a".repeat(152) + "“").segments, 3);
});

test("draft creation trims inputs, counts only subscribed recipients, and preserves previous data", () => {
  const data = createSeedData();
  const updated = createCampaign(data, {
    name: " New arrivals ",
    body: " Your business: Come say hello. ",
    audience: "Leads",
  });
  assert.equal(data.campaigns.length, 4);
  assert.equal(updated.campaigns.length, 5);
  assert.equal(updated.campaigns[0].status, "draft");
  assert.equal(updated.campaigns[0].recipients, 2);
  assert.equal(updated.campaigns[0].name, "New arrivals");
  assert.equal(updated.campaigns[0].body, "Your business: Come say hello.");
  assert.equal(updated.campaigns[0].scheduledAt, undefined);
  assert.equal(isAppData(updated), true);
});

test("future scheduling normalizes timezone and rejects past, equal, or invalid times", () => {
  const data = createSeedData();
  const now = new Date("2026-10-06T12:00:00Z");
  const input = {
    name: "Tomorrow",
    body: "Your business: See you soon.",
    audience: "VIP" as const,
  };
  const updated = createCampaign(
    data,
    { ...input, scheduledAt: "2026-10-07T09:00:00-07:00" },
    now,
  );
  assert.equal(updated.campaigns[0].status, "scheduled");
  assert.equal(updated.campaigns[0].scheduledAt, "2026-10-07T16:00:00.000Z");
  assert.equal(isAppData(updated), true);
  for (const scheduledAt of ["2026-10-06T11:59:59Z", now.toISOString()]) {
    assert.throws(
      () => createCampaign(data, { ...input, scheduledAt }, now),
      /future/,
    );
  }
  assert.throws(
    () => createCampaign(data, { ...input, scheduledAt: "not a date" }, now),
    /valid date/,
  );
  assert.throws(
    () => createCampaign(data, { ...input, scheduledAt: "" }, now),
    /valid date/,
  );
});

test("an explicit empty-draft option permits preparation without changing scheduling or default validation", () => {
  const data = {
    ...createSeedData(),
    contacts: [],
    conversations: [],
    campaigns: [],
  };
  const input = {
    name: "Our first offer",
    body: "Your business: Come say hello.",
    audience: "All subscribers" as const,
  };
  assert.throws(() => createCampaign(data, input), /no subscribed contacts/);
  assert.throws(
    () => createCampaign(data, { ...input, allowEmptyDraft: false }),
    /no subscribed contacts/,
  );
  const updated = createCampaign(data, { ...input, allowEmptyDraft: true });
  assert.equal(updated.campaigns[0].status, "draft");
  assert.equal(updated.campaigns[0].recipients, 0);
  assert.equal(updated.campaigns[0].scheduledAt, undefined);
  assert.equal("allowEmptyDraft" in updated.campaigns[0], false);
  assert.equal(data.campaigns.length, 0);
  assert.equal(isAppData(updated), true);
  assert.throws(
    () => createCampaign(data, { ...input, allowEmptyDraft: true, body: " " }),
    /message/,
  );
  for (const scheduledAt of ["2026-10-07T12:00:00Z", "", "invalid"]) {
    assert.throws(
      () =>
        createCampaign(
          data,
          { ...input, allowEmptyDraft: true, scheduledAt },
          new Date("2026-10-06T12:00:00Z"),
        ),
      /no subscribed contacts/,
    );
  }
});

test("campaign creation enforces message, name, and audience validation", () => {
  const data = createSeedData();
  const input = {
    name: "Hello",
    body: "Your business: Hello!",
    audience: "VIP" as const,
  };
  assert.throws(() => createCampaign(data, { ...input, name: " " }), /name/);
  assert.throws(
    () => createCampaign(data, { ...input, name: "a".repeat(81) }),
    /80/,
  );
  assert.throws(
    () => createCampaign(data, { ...input, body: "\n " }),
    /message/,
  );
  assert.throws(
    () => createCampaign(data, { ...input, body: "a".repeat(1601) }),
    /1,600/,
  );
  data.contacts.forEach((contact) => {
    contact.consent = "unsubscribed";
  });
  assert.throws(() => createCampaign(data, input), /no subscribed contacts/);
});

test("reply checks current consent and leaves original messages untouched", () => {
  const data = createSeedData();
  const originalLength = data.conversations[0].messages.length;
  const updated = replyToConversation(
    data,
    "conversation-1",
    " Yes, you can! ",
  );
  assert.equal(data.conversations[0].messages.length, originalLength);
  assert.equal(updated.conversations[0].messages.length, originalLength + 1);
  assert.equal(updated.conversations[0].messages.at(-1)?.body, "Yes, you can!");
  assert.equal(updated.conversations[0].unread, false);
  assert.equal(isAppData(updated), true);
  data.contacts[0].consent = "unsubscribed";
  assert.throws(
    () => replyToConversation(data, "conversation-1", "Hello"),
    /opted out/,
  );
  assert.throws(
    () => replyToConversation(data, "conversation-5", "Hello"),
    /opted out/,
  );
  assert.throws(
    () => replyToConversation(data, "missing", "Hello"),
    /could not be found/,
  );
  assert.throws(
    () => replyToConversation(createSeedData(), "conversation-1", " "),
    /message/,
  );
});

test("marking read is immutable and preserves messages", () => {
  const data = createSeedData();
  const updated = markConversationRead(data, "conversation-1");
  assert.equal(data.conversations[0].unread, true);
  assert.equal(updated.conversations[0].unread, false);
  assert.equal(
    updated.conversations[0].messages,
    data.conversations[0].messages,
  );
  assert.equal(markConversationRead(updated, "conversation-1"), updated);
  assert.throws(
    () => markConversationRead(data, "missing"),
    /could not be found/,
  );
});

test("persistence validation rejects malformed nested values and broken relationships", () => {
  assert.equal(isAppData(null), false);
  assert.equal(isAppData([]), false);
  assert.equal(
    isAppData({ version: 1, contacts: [], conversations: [], campaigns: [] }),
    true,
  );
  const corruptions: ((data: any) => void)[] = [
    (data) => {
      data.version = 2;
    },
    (data) => {
      data.contacts[0].consent = "yes";
    },
    (data) => {
      data.contacts[0].group = "Friends";
    },
    (data) => {
      data.contacts[0].phone = "not a phone";
    },
    (data) => {
      data.contacts[0].name = "";
    },
    (data) => {
      data.contacts[1].id = data.contacts[0].id;
    },
    (data) => {
      data.conversations[0].contactId = "missing";
    },
    (data) => {
      data.conversations[0].unread = "true";
    },
    (data) => {
      data.conversations[1].contactId = data.conversations[0].contactId;
    },
    (data) => {
      data.conversations[0].messages[0].direction = "sideways";
    },
    (data) => {
      data.conversations[0].messages[0].body = null;
    },
    (data) => {
      data.conversations[0].messages[1].id =
        data.conversations[0].messages[0].id;
    },
    (data) => {
      data.campaigns[0].recipients = -1;
    },
    (data) => {
      data.campaigns[0].recipients = NaN;
    },
    (data) => {
      data.campaigns[0].delivered = 0.5;
    },
    (data) => {
      data.campaigns[0].delivered = data.campaigns[0].recipients + 1;
    },
    (data) => {
      data.campaigns[0].replies = "many";
    },
    (data) => {
      data.campaigns[0].audience = "Everyone";
    },
    (data) => {
      data.campaigns[0].status = "scheduled";
    },
    (data) => {
      data.campaigns[0].scheduledAt = "invalid";
    },
  ];
  for (const corrupt of corruptions) {
    const data = createSeedData();
    corrupt(data);
    assert.equal(isAppData(data), false, corrupt.toString());
  }
});

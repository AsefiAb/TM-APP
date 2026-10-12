import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_SUBSCRIBERS,
  AppData,
  DEFAULT_GROUPS,
  addContact,
  addGroup,
  createCampaign,
  createSeedData,
  deleteCampaign,
  getAudienceContacts,
  getGroups,
  isAppData,
  normalizePhone,
  removeContact,
  updateContact,
} from "./domain";

function emptyWorkspace(): AppData {
  return {
    version: 1,
    groups: [...DEFAULT_GROUPS],
    contacts: [],
    conversations: [],
    campaigns: [],
  };
}

const consented = {
  name: " Sarah  Lee ",
  phone: "(925) 555-0182",
  group: "VIP",
  consentConfirmed: true,
};

test("phone numbers normalize to E.164 and reject invalid input", () => {
  assert.equal(normalizePhone("(925) 555-0182"), "+19255550182");
  assert.equal(normalizePhone("925.555.0182"), "+19255550182");
  assert.equal(normalizePhone("+1 925 555 0182"), "+19255550182");
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  assert.equal(normalizePhone("19255550182"), "+19255550182");
  for (const bad of ["", "   ", "555-0182", "abc", "+0 123 456 7890", "1234567"])
    assert.throws(() => normalizePhone(bad), /mobile number|digits/i, bad);
});

test("adding a subscriber requires consent, a group, and a unique number", () => {
  const now = new Date("2026-10-12T15:00:00.000Z");
  const data = addContact(emptyWorkspace(), consented, now);
  assert.equal(data.contacts.length, 1);
  assert.deepEqual(
    { ...data.contacts[0], id: "x" },
    {
      id: "x",
      name: "Sarah Lee",
      phone: "+19255550182",
      group: "VIP",
      consent: "subscribed",
      createdAt: now.toISOString(),
    },
  );
  assert.equal(isAppData(data), true);
  assert.throws(
    () => addContact(data, { ...consented, phone: "+1 (925) 555-0182" }),
    /already exists/,
  );
  assert.throws(
    () => addContact(data, { ...consented, phone: "925 555 0199", consentConfirmed: false }),
    /agreed to receive/,
  );
  assert.throws(
    () => addContact(data, { ...consented, phone: "925 555 0199", group: "Nope" }),
    /Choose a group/,
  );
  assert.throws(() => addContact(data, { ...consented, name: "  " }), /name/);
});

test("subscriber edits record opt-outs, honor consent in audiences, and stay immutable", () => {
  const start = addContact(emptyWorkspace(), consented);
  const id = start.contacts[0].id;
  const optedOut = updateContact(start, id, { consent: "unsubscribed" }, new Date("2026-10-13T10:00:00.000Z"));
  assert.equal(start.contacts[0].consent, "subscribed");
  assert.equal(optedOut.contacts[0].consent, "unsubscribed");
  assert.equal(optedOut.contacts[0].optedOutAt, "2026-10-13T10:00:00.000Z");
  assert.equal(getAudienceContacts(optedOut.contacts, ALL_SUBSCRIBERS, getGroups(optedOut)).length, 0);
  const back = updateContact(optedOut, id, { consent: "subscribed", group: "Leads", name: "Sarah L." });
  assert.equal(back.contacts[0].optedOutAt, undefined);
  assert.equal(back.contacts[0].group, "Leads");
  assert.equal(back.contacts[0].name, "Sarah L.");
  assert.throws(() => updateContact(back, id, { group: "Missing" }), /Choose a group/);
  assert.throws(() => updateContact(back, "nope", { name: "x" }), /could not be found/);
  assert.equal(isAppData(back), true);
});

test("removing a subscriber also drops their local conversation", () => {
  const seed = createSeedData();
  const removed = removeContact(seed, "contact-1");
  assert.equal(removed.contacts.some((c) => c.id === "contact-1"), false);
  assert.equal(removed.conversations.some((c) => c.contactId === "contact-1"), false);
  assert.equal(seed.contacts.length, 12);
  assert.equal(isAppData(removed), true);
  assert.throws(() => removeContact(seed, "missing"), /could not be found/);
});

test("groups are unique, reserved names are rejected, and campaigns target new groups", () => {
  const withGroup = addGroup(emptyWorkspace(), "  Weekend   regulars ");
  assert.deepEqual(getGroups(withGroup), [...DEFAULT_GROUPS, "Weekend regulars"]);
  assert.throws(() => addGroup(withGroup, "weekend REGULARS"), /already exists/);
  assert.throws(() => addGroup(withGroup, "All subscribers"), /reserved/);
  assert.throws(() => addGroup(withGroup, ""), /group name/);
  const withContact = addContact(withGroup, { ...consented, group: "Weekend regulars" });
  const campaign = createCampaign(withContact, {
    name: "Weekend hours",
    body: "Open late this Saturday.",
    audience: "Weekend regulars",
    type: "SMS",
  });
  assert.equal(campaign.campaigns[0].recipients, 1);
  assert.equal(campaign.campaigns[0].type, "SMS");
  assert.ok(campaign.campaigns[0].createdAt);
  assert.equal(isAppData(campaign), true);
  assert.throws(
    () => createCampaign(withContact, { name: "x", body: "y", audience: "Unknown" }),
    /valid audience/,
  );
  assert.throws(
    () =>
      createCampaign(withContact, {
        name: "x",
        body: "y",
        audience: ALL_SUBSCRIBERS,
        type: "FAX" as never,
      }),
    /campaign type/,
  );
});

test("legacy saved data without groups still validates and defaults to the standard groups", () => {
  const legacy = createSeedData();
  delete legacy.groups;
  assert.equal(isAppData(legacy), true);
  assert.deepEqual(getGroups(legacy), [...DEFAULT_GROUPS]);
  const broken = { ...createSeedData(), groups: ["VIP", "vip"] };
  assert.equal(isAppData(broken), false);
  const orphan = { ...createSeedData(), groups: ["Members"] };
  assert.equal(isAppData(orphan), false, "contacts in a removed group are rejected");
  const badType = createSeedData();
  badType.campaigns[0] = { ...badType.campaigns[0], type: "Email" as never };
  assert.equal(isAppData(badType), false);
});

test("drafts and schedules can be deleted but sent campaigns are kept", () => {
  const seed = createSeedData();
  const removed = deleteCampaign(seed, "campaign-3");
  assert.equal(removed.campaigns.length, 3);
  assert.equal(seed.campaigns.length, 4);
  assert.throws(() => deleteCampaign(seed, "campaign-1"), /kept/);
  assert.throws(() => deleteCampaign(seed, "missing"), /could not be found/);
});

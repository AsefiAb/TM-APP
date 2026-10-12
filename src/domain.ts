export type Contact = {
  id: string;
  name: string;
  phone: string;
  /** A group name from `AppData.groups` (or the default groups). */
  group: string;
  consent: "subscribed" | "unsubscribed";
  /** ISO timestamp of when the owner added this subscriber on the device. */
  createdAt?: string;
  /** ISO timestamp of the most recent local opt-out. */
  optedOutAt?: string;
};

export type CampaignType = "SMS" | "MMS" | "RCS";

/** The owner's own projection inputs, saved with a campaign for later comparison. */
export type CampaignEstimate = {
  redemptionRate: number;
  averageTicket: number;
  costPerMessage: number;
};

/** What actually happened, entered by the owner after sending through SAM. */
export type CampaignResults = {
  redemptions: number;
  revenue: number;
  note?: string;
  recordedAt: string;
};

export type Message = {
  id: string;
  body: string;
  direction: "inbound" | "outbound";
  time: string;
};

export type Conversation = {
  id: string;
  contactId: string;
  unread: boolean;
  messages: Message[];
};

export type Campaign = {
  id: string;
  name: string;
  body: string;
  /** "All subscribers" or a group name. */
  audience: string;
  status: "draft" | "scheduled" | "sent";
  type?: CampaignType;
  scheduledAt?: string;
  createdAt?: string;
  /** When the owner marked it sent through SAM. */
  sentAt?: string;
  /** The idea this campaign started from, if any. */
  ideaId?: string;
  estimate?: CampaignEstimate;
  results?: CampaignResults;
  recipients: number;
  delivered?: number;
  replies?: number;
};

export type AppData = {
  version: 1;
  /** Owner-defined subscriber groups. Missing means the default groups. */
  groups?: string[];
  contacts: Contact[];
  conversations: Conversation[];
  campaigns: Campaign[];
};

export type CampaignInput = Pick<
  Campaign,
  "name" | "body" | "audience" | "scheduledAt" | "type" | "ideaId" | "estimate"
> & {
  /** Allows preparing a draft before contacts are added; never permits scheduling. */
  allowEmptyDraft?: boolean;
};

export type ContactInput = {
  name: string;
  phone: string;
  group: string;
  /** The owner confirms the person agreed to receive texts. */
  consentConfirmed: boolean;
};

export const ALL_SUBSCRIBERS = "All subscribers";
export const DEFAULT_GROUPS: readonly string[] = ["VIP", "Members", "Leads"];
export const CAMPAIGN_TYPES: readonly CampaignType[] = ["SMS", "MMS", "RCS"];
const MAX_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 280;
const MAX_MONEY = 1_000_000_000;
const MAX_GROUP_LENGTH = 40;
const MAX_GROUPS = 50;
const MAX_MESSAGE_LENGTH = 1600;
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENSION = new Set("^{}\\[~]|€\f");

/** All records are fictional. Each call returns independent, editable data. */
export function createSeedData(): AppData {
  return {
    version: 1,
    groups: [...DEFAULT_GROUPS],
    contacts: [
      {
        id: "contact-1",
        name: "Olivia Bennett",
        phone: "+12025550101",
        group: "VIP",
        consent: "subscribed",
      },
      {
        id: "contact-2",
        name: "Marcus Reed",
        phone: "+12025550102",
        group: "Members",
        consent: "subscribed",
      },
      {
        id: "contact-3",
        name: "Ava Chen",
        phone: "+12025550103",
        group: "Leads",
        consent: "subscribed",
      },
      {
        id: "contact-4",
        name: "Ethan Brooks",
        phone: "+12025550104",
        group: "Members",
        consent: "subscribed",
      },
      {
        id: "contact-5",
        name: "Sofia Rivera",
        phone: "+12025550105",
        group: "VIP",
        consent: "subscribed",
      },
      {
        id: "contact-6",
        name: "Liam Parker",
        phone: "+12025550106",
        group: "Members",
        consent: "subscribed",
      },
      {
        id: "contact-7",
        name: "Maya Johnson",
        phone: "+12025550107",
        group: "Leads",
        consent: "subscribed",
      },
      {
        id: "contact-8",
        name: "Noah Williams",
        phone: "+12025550108",
        group: "Members",
        consent: "subscribed",
      },
      {
        id: "contact-9",
        name: "Chloe Davis",
        phone: "+12025550109",
        group: "VIP",
        consent: "subscribed",
      },
      {
        id: "contact-10",
        name: "James Wilson",
        phone: "+12025550110",
        group: "Leads",
        consent: "unsubscribed",
      },
      {
        id: "contact-11",
        name: "Mia Thompson",
        phone: "+12025550111",
        group: "Members",
        consent: "subscribed",
      },
      {
        id: "contact-12",
        name: "Daniel Kim",
        phone: "+12025550112",
        group: "Leads",
        consent: "unsubscribed",
      },
    ],
    conversations: [
      {
        id: "conversation-1",
        contactId: "contact-1",
        unread: true,
        messages: [
          {
            id: "message-1",
            body: "Your business: A little thank-you for our VIPs. Enjoy 20% off your next visit this week. Reply STOP to opt out.",
            direction: "outbound",
            time: "10:30 AM",
          },
          {
            id: "message-2",
            body: "Love this! Can I bring a friend along?",
            direction: "inbound",
            time: "10:42 AM",
          },
        ],
      },
      {
        id: "conversation-2",
        contactId: "contact-2",
        unread: true,
        messages: [
          {
            id: "message-3",
            body: "Your business: Your member perk is waiting. Reply PERK and our team will help you redeem it. Reply STOP to opt out.",
            direction: "outbound",
            time: "9:45 AM",
          },
          {
            id: "message-4",
            body: "PERK. What time do you close today?",
            direction: "inbound",
            time: "10:18 AM",
          },
        ],
      },
      {
        id: "conversation-3",
        contactId: "contact-3",
        unread: false,
        messages: [
          {
            id: "message-5",
            body: "Hi! I signed up on your website. Can you tell me more?",
            direction: "inbound",
            time: "9:12 AM",
          },
          {
            id: "message-6",
            body: "Absolutely, Ava! What would you like to know about Your business?",
            direction: "outbound",
            time: "9:15 AM",
          },
          {
            id: "message-7",
            body: "Do you have any availability this weekend?",
            direction: "inbound",
            time: "9:17 AM",
          },
        ],
      },
      {
        id: "conversation-4",
        contactId: "contact-5",
        unread: false,
        messages: [
          {
            id: "message-8",
            body: "Thank you for taking such good care of us yesterday!",
            direction: "inbound",
            time: "Yesterday",
          },
          {
            id: "message-9",
            body: "You made our day, Sofia. We look forward to seeing you again! - Your business",
            direction: "outbound",
            time: "Yesterday",
          },
        ],
      },
      {
        id: "conversation-5",
        contactId: "contact-12",
        unread: false,
        messages: [
          {
            id: "message-10",
            body: "Your business: Welcome! Reply with a question and our team will help. Reply STOP to opt out.",
            direction: "outbound",
            time: "Monday",
          },
          {
            id: "message-11",
            body: "STOP",
            direction: "inbound",
            time: "Monday",
          },
        ],
      },
    ],
    campaigns: [
      {
        id: "campaign-1",
        name: "A little thanks for our VIPs",
        body: "Your business: A little thank-you for our VIPs. Enjoy 20% off your next visit this week. Reply STOP to opt out.",
        audience: "VIP",
        status: "sent",
        recipients: 3,
        delivered: 3,
        replies: 1,
      },
      {
        id: "campaign-2",
        name: "Your member moment",
        body: "Your business: Your member perk is waiting. Reply PERK and our team will help you redeem it. Reply STOP to opt out.",
        audience: "Members",
        status: "sent",
        recipients: 5,
        delivered: 5,
        replies: 2,
      },
      {
        id: "campaign-3",
        name: "Something good this weekend",
        body: "Your business: Make a little time for yourself this weekend. Reply WEEKEND to learn what is coming up. Reply STOP to opt out.",
        audience: "All subscribers",
        status: "draft",
        recipients: 10,
      },
      {
        id: "campaign-4",
        name: "Nice to meet you",
        body: "Your business: Thanks for joining our community! Reply HELLO and let us help you plan your first visit. Reply STOP to opt out.",
        audience: "Leads",
        status: "draft",
        recipients: 2,
      },
    ],
  };
}

/** The group list for a workspace; older saved data has no explicit groups. */
export function getGroups(data: Pick<AppData, "groups">): string[] {
  return data.groups ?? [...DEFAULT_GROUPS];
}

/** Opted-out contacts are excluded even when their group matches. */
export function getAudienceContacts(
  contacts: Contact[],
  audience: string,
  groups: readonly string[] = DEFAULT_GROUPS,
): Contact[] {
  if (audience !== ALL_SUBSCRIBERS && !groups.includes(audience))
    throw new Error("Choose a valid audience.");
  return contacts.filter(
    (contact) =>
      contact.consent === "subscribed" &&
      (audience === ALL_SUBSCRIBERS || contact.group === audience),
  );
}

/**
 * Normalizes a typed mobile number to E.164. Ten-digit North American numbers
 * receive the +1 country code; other numbers must include their country code.
 */
export function normalizePhone(input: string): string {
  if (typeof input !== "string") throw new Error("Enter a mobile number.");
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a mobile number.");
  if (!/^[+\d\s().-]+$/.test(trimmed))
    throw new Error("Use digits only, with an optional country code.");
  const digits = trimmed.replace(/\D/g, "");
  const candidate =
    trimmed.startsWith("+") || digits.length !== 10 ? digits : `1${digits}`;
  const phone = `+${candidate}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error(
      "Enter a valid mobile number, for example 925 555 0182 or +1 925 555 0182.",
    );
  return phone;
}

function cleanName(value: unknown, label: string, max: number): string {
  const name =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new Error(`Enter ${label}.`);
  if (name.length > max)
    throw new Error(`Keep ${label} to ${max} characters or fewer.`);
  return name;
}

/** Adds a subscriber the owner has permission to text. Never imports or sends. */
export function addContact(
  data: AppData,
  input: ContactInput,
  now = new Date(),
): AppData {
  const name = cleanName(input.name, "the subscriber's name", MAX_NAME_LENGTH);
  const phone = normalizePhone(input.phone);
  const groups = getGroups(data);
  if (!groups.includes(input.group)) throw new Error("Choose a group.");
  if (input.consentConfirmed !== true)
    throw new Error(
      "Confirm that this person agreed to receive text messages from you.",
    );
  if (data.contacts.some((contact) => contact.phone === phone))
    throw new Error("A subscriber with this mobile number already exists.");
  const contact: Contact = {
    id: newId("contact"),
    name,
    phone,
    group: input.group,
    consent: "subscribed",
    createdAt: now.toISOString(),
  };
  return { ...data, contacts: [contact, ...data.contacts] };
}

/** Edits a subscriber's name, group, or consent. Opt-outs are recorded locally. */
export function updateContact(
  data: AppData,
  id: string,
  patch: Partial<Pick<Contact, "name" | "group" | "consent">>,
  now = new Date(),
): AppData {
  const existing = data.contacts.find((contact) => contact.id === id);
  if (!existing) throw new Error("This subscriber could not be found.");
  const next: Contact = { ...existing };
  if (patch.name !== undefined)
    next.name = cleanName(patch.name, "the subscriber's name", MAX_NAME_LENGTH);
  if (patch.group !== undefined) {
    if (!getGroups(data).includes(patch.group))
      throw new Error("Choose a group.");
    next.group = patch.group;
  }
  if (patch.consent !== undefined && patch.consent !== existing.consent) {
    if (patch.consent !== "subscribed" && patch.consent !== "unsubscribed")
      throw new Error("Choose a valid consent status.");
    next.consent = patch.consent;
    if (patch.consent === "unsubscribed") next.optedOutAt = now.toISOString();
    else delete next.optedOutAt;
  }
  return {
    ...data,
    contacts: data.contacts.map((contact) =>
      contact.id === id ? next : contact,
    ),
  };
}

/** Removes a subscriber and any local conversation with them. */
export function removeContact(data: AppData, id: string): AppData {
  if (!data.contacts.some((contact) => contact.id === id))
    throw new Error("This subscriber could not be found.");
  return {
    ...data,
    contacts: data.contacts.filter((contact) => contact.id !== id),
    conversations: data.conversations.filter(
      (conversation) => conversation.contactId !== id,
    ),
  };
}

/** Creates a manual subscriber group. Names are unique, ignoring case. */
export function addGroup(data: AppData, name: string): AppData {
  const group = cleanName(name, "a group name", MAX_GROUP_LENGTH);
  if (group.toLowerCase() === ALL_SUBSCRIBERS.toLowerCase())
    throw new Error("That name is reserved. Choose another group name.");
  const groups = getGroups(data);
  if (groups.some((item) => item.toLowerCase() === group.toLowerCase()))
    throw new Error("A group with this name already exists.");
  if (groups.length >= MAX_GROUPS)
    throw new Error(`Keep to ${MAX_GROUPS} groups or fewer.`);
  return { ...data, groups: [...groups, group] };
}

/**
 * Records that the owner sent this campaign through SAM. The recipient count
 * is recalculated from current consent at that moment; the schedule is cleared.
 */
export function markCampaignSent(
  data: AppData,
  id: string,
  now = new Date(),
): AppData {
  const campaign = data.campaigns.find((item) => item.id === id);
  if (!campaign) throw new Error("This campaign could not be found.");
  if (campaign.status === "sent")
    throw new Error("This campaign is already marked as sent.");
  const recipients = getAudienceContacts(
    data.contacts,
    campaign.audience,
    getGroups(data),
  ).length;
  const sent: Campaign = {
    ...campaign,
    status: "sent",
    recipients,
    sentAt: now.toISOString(),
  };
  delete sent.scheduledAt;
  return {
    ...data,
    campaigns: data.campaigns.map((item) => (item.id === id ? sent : item)),
  };
}

/** Saves the real outcome the owner observed for a sent campaign. */
export function recordCampaignResults(
  data: AppData,
  id: string,
  input: { redemptions: number; revenue: number; note?: string },
  now = new Date(),
): AppData {
  const campaign = data.campaigns.find((item) => item.id === id);
  if (!campaign) throw new Error("This campaign could not be found.");
  if (campaign.status !== "sent")
    throw new Error("Mark the campaign as sent before logging results.");
  if (!isCount(input.redemptions))
    throw new Error("Enter the number of redemptions as a whole number.");
  if (
    typeof input.revenue !== "number" ||
    !Number.isFinite(input.revenue) ||
    input.revenue < 0 ||
    input.revenue > MAX_MONEY
  )
    throw new Error("Enter the revenue as a dollar amount.");
  const note =
    typeof input.note === "string" ? input.note.trim().slice(0, MAX_NOTE_LENGTH) : "";
  const results: CampaignResults = {
    redemptions: input.redemptions,
    revenue: Math.round(input.revenue * 100) / 100,
    recordedAt: now.toISOString(),
    ...(note ? { note } : {}),
  };
  return {
    ...data,
    campaigns: data.campaigns.map((item) =>
      item.id === id ? { ...item, results } : item,
    ),
  };
}

/** Deletes a draft or scheduled campaign. Sent history is kept. */
export function deleteCampaign(data: AppData, id: string): AppData {
  const campaign = data.campaigns.find((item) => item.id === id);
  if (!campaign) throw new Error("This campaign could not be found.");
  if (campaign.status === "sent")
    throw new Error("Sent campaigns are kept for your records.");
  return {
    ...data,
    campaigns: data.campaigns.filter((item) => item.id !== id),
  };
}

/**
 * Estimates ordinary SMS segments, with no smart encoding or sender-specific rules.
 * `characters` is the encoded length: GSM septets, or UTF-16 units for Unicode.
 * Extended GSM characters and Unicode surrogate pairs stay within one segment.
 * Reference: https://www.twilio.com/docs/glossary/what-sms-character-limit
 */
export function getSmsInfo(body: string): {
  encoding: "GSM-7" | "Unicode";
  characters: number;
  segments: number;
} {
  const codePoints = Array.from(body);
  const isGsm = codePoints.every(
    (char) => GSM_BASIC.has(char) || GSM_EXTENSION.has(char),
  );
  const widths = codePoints.map((char) =>
    isGsm ? (GSM_EXTENSION.has(char) ? 2 : 1) : char.length,
  );
  const characters = widths.reduce((total, width) => total + width, 0);
  const encoding = isGsm ? "GSM-7" : "Unicode";
  if (characters === 0) return { encoding, characters, segments: 0 };
  if (characters <= (isGsm ? 160 : 70))
    return { encoding, characters, segments: 1 };

  const capacity = isGsm ? 153 : 67;
  let segments = 1;
  let used = 0;
  for (const width of widths) {
    if (used + width > capacity) {
      segments += 1;
      used = 0;
    }
    used += width;
  }
  return { encoding, characters, segments };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(body: string): string {
  if (typeof body !== "string" || !body.trim())
    throw new Error("Write a message before continuing.");
  const normalized = body.trim();
  if (normalized.length > MAX_MESSAGE_LENGTH)
    throw new Error(
      `Keep the message to ${MAX_MESSAGE_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    );
  return normalized;
}

/** Saves local demo data only; scheduled items require a backend to execute. */
export function createCampaign(
  data: AppData,
  input: CampaignInput,
  now = new Date(),
): AppData {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new Error("Give your campaign a name.");
  if (name.length > MAX_NAME_LENGTH)
    throw new Error(
      `Keep the campaign name to ${MAX_NAME_LENGTH} characters or fewer.`,
    );
  const body = normalizeMessage(input.body);
  const type = input.type ?? "SMS";
  if (!CAMPAIGN_TYPES.includes(type))
    throw new Error("Choose a campaign type.");
  const recipients = getAudienceContacts(
    data.contacts,
    input.audience,
    getGroups(data),
  ).length;
  const allowEmptyDraft =
    input.allowEmptyDraft === true && input.scheduledAt === undefined;
  if (!recipients && !allowEmptyDraft)
    throw new Error(
      "This audience has no subscribed contacts. Choose another audience.",
    );

  let scheduledAt: string | undefined;
  if (input.scheduledAt !== undefined) {
    const timestamp =
      typeof input.scheduledAt === "string"
        ? Date.parse(input.scheduledAt)
        : NaN;
    if (!Number.isFinite(timestamp))
      throw new Error("Choose a valid date and time.");
    if (!Number.isFinite(now.getTime()))
      throw new Error("The current date and time is invalid.");
    if (timestamp <= now.getTime())
      throw new Error("Schedule your campaign for a future date and time.");
    scheduledAt = new Date(timestamp).toISOString();
  }

  if (input.estimate !== undefined && !isEstimate(input.estimate))
    throw new Error("Check the projection inputs and try again.");
  if (input.ideaId !== undefined && !isText(input.ideaId, 40))
    throw new Error("Choose a valid campaign idea.");
  const campaign: Campaign = {
    id: newId("campaign"),
    name,
    body,
    audience: input.audience,
    status: scheduledAt ? "scheduled" : "draft",
    type,
    createdAt: now.toISOString(),
    recipients,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(input.ideaId ? { ideaId: input.ideaId } : {}),
    ...(input.estimate ? { estimate: { ...input.estimate } } : {}),
  };
  return { ...data, campaigns: [campaign, ...data.campaigns] };
}

/** Rechecks current contact consent each time; this never sends a real SMS. */
export function replyToConversation(
  data: AppData,
  id: string,
  body: string,
): AppData {
  const conversation = data.conversations.find((item) => item.id === id);
  if (!conversation) throw new Error("This conversation could not be found.");
  const contact = data.contacts.find(
    (item) => item.id === conversation.contactId,
  );
  if (!contact)
    throw new Error("The contact for this conversation could not be found.");
  if (contact.consent !== "subscribed")
    throw new Error("This contact has opted out. Replies are disabled.");
  const message: Message = {
    id: newId("message"),
    body: normalizeMessage(body),
    direction: "outbound",
    time: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
  return {
    ...data,
    conversations: data.conversations.map((item) =>
      item.id === id
        ? { ...item, unread: false, messages: [...item.messages, message] }
        : item,
    ),
  };
}

export function markConversationRead(data: AppData, id: string): AppData {
  const conversation = data.conversations.find((item) => item.id === id);
  if (!conversation) throw new Error("This conversation could not be found.");
  if (!conversation.unread) return data;
  return {
    ...data,
    conversations: data.conversations.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength = Infinity): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isOptionalDate(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}

function isContact(
  value: unknown,
  groups: readonly string[],
): value is Contact {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name, MAX_NAME_LENGTH) &&
    typeof value.phone === "string" &&
    /^\+[1-9]\d{7,14}$/.test(value.phone) &&
    typeof value.group === "string" &&
    groups.includes(value.group) &&
    (value.consent === "subscribed" || value.consent === "unsubscribed") &&
    isOptionalDate(value.createdAt) &&
    isOptionalDate(value.optedOutAt)
  );
}

function isEstimate(value: unknown): value is CampaignEstimate {
  if (!isRecord(value)) return false;
  const { redemptionRate, averageTicket, costPerMessage } = value;
  return (
    typeof redemptionRate === "number" &&
    Number.isFinite(redemptionRate) &&
    redemptionRate >= 0 &&
    redemptionRate <= 1 &&
    typeof averageTicket === "number" &&
    Number.isFinite(averageTicket) &&
    averageTicket >= 0 &&
    averageTicket <= MAX_MONEY &&
    typeof costPerMessage === "number" &&
    Number.isFinite(costPerMessage) &&
    costPerMessage >= 0 &&
    costPerMessage <= 1000
  );
}

function isResults(value: unknown): value is CampaignResults {
  if (!isRecord(value)) return false;
  return (
    isCount(value.redemptions) &&
    typeof value.revenue === "number" &&
    Number.isFinite(value.revenue) &&
    value.revenue >= 0 &&
    value.revenue <= MAX_MONEY &&
    (value.note === undefined ||
      (typeof value.note === "string" && value.note.length <= MAX_NOTE_LENGTH)) &&
    typeof value.recordedAt === "string" &&
    Number.isFinite(Date.parse(value.recordedAt))
  );
}

function isGroupList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_GROUPS &&
    value.every(
      (item) =>
        isText(item, MAX_GROUP_LENGTH) &&
        item.toLowerCase() !== ALL_SUBSCRIBERS.toLowerCase(),
    ) &&
    new Set(value.map((item) => item.toLowerCase())).size === value.length
  );
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.body, MAX_MESSAGE_LENGTH) &&
    (value.direction === "inbound" || value.direction === "outbound") &&
    isText(value.time)
  );
}

function isConversation(value: unknown): value is Conversation {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.contactId) &&
    typeof value.unread === "boolean" &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function isCampaign(
  value: unknown,
  groups: readonly string[],
): value is Campaign {
  if (
    !isRecord(value) ||
    !isText(value.id) ||
    !isText(value.name, MAX_NAME_LENGTH) ||
    !isText(value.body, MAX_MESSAGE_LENGTH) ||
    typeof value.audience !== "string" ||
    (value.audience !== ALL_SUBSCRIBERS && !groups.includes(value.audience)) ||
    !["draft", "scheduled", "sent"].includes(value.status as string) ||
    (value.type !== undefined &&
      !CAMPAIGN_TYPES.includes(value.type as CampaignType)) ||
    !isOptionalDate(value.createdAt) ||
    !isOptionalDate(value.sentAt) ||
    (value.ideaId !== undefined && !isText(value.ideaId, 40)) ||
    (value.estimate !== undefined && !isEstimate(value.estimate)) ||
    (value.results !== undefined && !isResults(value.results)) ||
    (value.results !== undefined && value.status !== "sent") ||
    !isCount(value.recipients)
  )
    return false;
  if (
    value.scheduledAt !== undefined &&
    (typeof value.scheduledAt !== "string" ||
      !Number.isFinite(Date.parse(value.scheduledAt)))
  )
    return false;
  if (value.status === "scheduled" && value.scheduledAt === undefined)
    return false;
  if (
    value.delivered !== undefined &&
    (!isCount(value.delivered) || value.delivered > value.recipients)
  )
    return false;
  if (value.replies !== undefined && !isCount(value.replies)) return false;
  return true;
}

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

/** Rejects malformed nested records and broken references before restoring storage. */
export function isAppData(input: unknown): input is AppData {
  if (!isRecord(input) || input.version !== 1) return false;
  if (input.groups !== undefined && !isGroupList(input.groups)) return false;
  const groups = input.groups ?? DEFAULT_GROUPS;
  if (
    !Array.isArray(input.contacts) ||
    !input.contacts.every((contact) => isContact(contact, groups)) ||
    !Array.isArray(input.conversations) ||
    !input.conversations.every((conversation) => isConversation(conversation)) ||
    !Array.isArray(input.campaigns) ||
    !input.campaigns.every((campaign) => isCampaign(campaign, groups))
  )
    return false;

  const contacts = input.contacts as Contact[];
  const conversations = input.conversations as Conversation[];
  const campaigns = input.campaigns as Campaign[];
  const contactIds = new Set(contacts.map((contact) => contact.id));
  return (
    hasUniqueIds(contacts) &&
    hasUniqueIds(conversations) &&
    hasUniqueIds(campaigns) &&
    hasUniqueIds(
      conversations.flatMap((conversation) => conversation.messages),
    ) &&
    new Set(conversations.map((conversation) => conversation.contactId))
      .size === conversations.length &&
    conversations.every((conversation) =>
      contactIds.has(conversation.contactId),
    )
  );
}

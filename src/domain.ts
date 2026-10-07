export type Contact = {
  id: string;
  name: string;
  phone: string;
  group: "VIP" | "Members" | "Leads";
  consent: "subscribed" | "unsubscribed";
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
  audience: "All subscribers" | "VIP" | "Members" | "Leads";
  status: "draft" | "scheduled" | "sent";
  scheduledAt?: string;
  recipients: number;
  delivered?: number;
  replies?: number;
};

export type AppData = {
  version: 1;
  contacts: Contact[];
  conversations: Conversation[];
  campaigns: Campaign[];
};

export type CampaignInput = Pick<
  Campaign,
  "name" | "body" | "audience" | "scheduledAt"
> & {
  /** Allows preparing a draft before contacts are added; never permits scheduling. */
  allowEmptyDraft?: boolean;
};

const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 1600;
const GROUPS = ["VIP", "Members", "Leads"] as const;
const AUDIENCES = ["All subscribers", ...GROUPS] as const;
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENSION = new Set("^{}\\[~]|€\f");

/** All records are fictional. Each call returns independent, editable data. */
export function createSeedData(): AppData {
  return {
    version: 1,
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

/** Opted-out contacts are excluded even when their group matches. */
export function getAudienceContacts(
  contacts: Contact[],
  audience: Campaign["audience"],
): Contact[] {
  if (!AUDIENCES.includes(audience))
    throw new Error("Choose a valid audience.");
  return contacts.filter(
    (contact) =>
      contact.consent === "subscribed" &&
      (audience === "All subscribers" || contact.group === audience),
  );
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
  const recipients = getAudienceContacts(data.contacts, input.audience).length;
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

  const campaign: Campaign = {
    id: newId("campaign"),
    name,
    body,
    audience: input.audience,
    status: scheduledAt ? "scheduled" : "draft",
    recipients,
    ...(scheduledAt ? { scheduledAt } : {}),
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

function isContact(value: unknown): value is Contact {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name) &&
    typeof value.phone === "string" &&
    /^\+[1-9]\d{7,14}$/.test(value.phone) &&
    GROUPS.includes(value.group as Contact["group"]) &&
    (value.consent === "subscribed" || value.consent === "unsubscribed")
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

function isCampaign(value: unknown): value is Campaign {
  if (
    !isRecord(value) ||
    !isText(value.id) ||
    !isText(value.name, MAX_NAME_LENGTH) ||
    !isText(value.body, MAX_MESSAGE_LENGTH) ||
    !AUDIENCES.includes(value.audience as Campaign["audience"]) ||
    !["draft", "scheduled", "sent"].includes(value.status as string) ||
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
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    !Array.isArray(input.contacts) ||
    !input.contacts.every(isContact) ||
    !Array.isArray(input.conversations) ||
    !input.conversations.every(isConversation) ||
    !Array.isArray(input.campaigns) ||
    !input.campaigns.every(isCampaign)
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

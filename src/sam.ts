import {
  AppData,
  Campaign,
  CampaignEstimate,
  CampaignType,
  createCampaign,
} from "./domain";

export type CampaignGoal = "promotion" | "reengage" | "update";
export type WriterTone = "friendly" | "concise" | "energetic";
export type CampaignSeed = Pick<Campaign, "name" | "body" | "audience"> & {
  scheduledAt?: string;
  ideaId?: string;
  estimate?: CampaignEstimate;
};

export const goals: {
  id: CampaignGoal;
  title: string;
  description: string;
  icon: string;
  prompt: string;
}[] = [
  {
    id: "promotion",
    title: "Share an offer",
    description: "Give your audience a reason to visit.",
    icon: "tag",
    prompt: "What is the offer? Include the details people need to know.",
  },
  {
    id: "reengage",
    title: "Reconnect",
    description: "Start a conversation with your community.",
    icon: "heart",
    prompt: "What would you like people to know or do?",
  },
  {
    id: "update",
    title: "Send an update",
    description: "Keep everyone in the loop.",
    icon: "bell",
    prompt: "What has changed? Include any dates, times, or next steps.",
  },
];

type WriterInput = {
  goal: CampaignGoal;
  tone: WriterTone;
  details: string;
  businessName?: string;
};

const openings: Record<WriterTone, Record<CampaignGoal, string>> = {
  friendly: {
    promotion: "Something for you:",
    reengage: "Hello again!",
    update: "A quick update for you:",
  },
  concise: { promotion: "", reengage: "", update: "" },
  energetic: {
    promotion: "Take a look!",
    reengage: "Let's reconnect!",
    update: "Here's the latest!",
  },
};

/** Offline template assistance. All offer details come directly from the user. */
export function suggestMessage({
  goal,
  tone,
  details,
  businessName,
}: WriterInput): string {
  if (typeof details !== "string" || !details.trim())
    throw new Error(
      "Add a few details so your message says exactly what you mean.",
    );
  if (!goals.some((item) => item.id === goal))
    throw new Error("Choose a message goal.");
  if (!Object.hasOwn(openings, tone)) throw new Error("Choose a writing tone.");

  const business = typeof businessName === "string" ? businessName.trim() : "";
  return [business ? `${business}:` : "", openings[tone][goal], details.trim()]
    .filter(Boolean)
    .join(" ");
}

const OPT_OUT = "Reply STOP to opt out.";
const optOutPhrase = /\breply\s+stop\s+to\s+opt\s+out\b/i;

/** Keep the user's existing opt-out wording and never add a second footer. */
export function withOptOut(body: string): string {
  const text = body.trim();
  if (!text || optOutPhrase.test(text)) return text;
  return `${text}\n${OPT_OUT}`;
}

/** Suggest a compact, editable title without adding facts to the message. */
export function campaignTitle(body: string): string {
  const text = body
    .replace(/\breply\s+stop\s+to\s+opt\s+out\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "New campaign";
  if (text.length <= 60) return text;

  // Keep Unicode characters intact while respecting the name's string length.
  let title = "";
  for (const character of text) {
    if (title.length + character.length > 57) break;
    title += character;
  }
  return `${title.trimEnd()}...`;
}

/** Reuse content only; saving this seed creates a new, unscheduled draft. */
export function campaignToSeed(campaign: Campaign): CampaignSeed {
  const suffix = " (copy)";
  let name = "";
  for (const character of campaign.name.trim()) {
    if (name.length + character.length > 80 - suffix.length) break;
    name += character;
  }
  return {
    name: `${name.trimEnd()}${suffix}`,
    body: campaign.body,
    audience: campaign.audience,
    ...(campaign.ideaId ? { ideaId: campaign.ideaId } : {}),
    ...(campaign.estimate ? { estimate: { ...campaign.estimate } } : {}),
  };
}

type SaveCampaignInput = {
  id?: string;
  name: string;
  body: string;
  audience: Campaign["audience"];
  type?: CampaignType;
  scheduledAt?: string;
  ideaId?: string;
  estimate?: CampaignEstimate;
  allowEmptyDraft?: boolean;
};

/** Create or revise a local campaign; no remote scheduling or delivery occurs. */
export function saveCampaign(data: AppData, input: SaveCampaignInput): AppData {
  if (input.id === undefined) return createCampaign(data, input);

  const existing = data.campaigns.find((campaign) => campaign.id === input.id);
  if (!existing) throw new Error("This campaign could not be found.");
  if (existing.status === "sent")
    throw new Error(
      "Sent campaigns cannot be edited. Start a new campaign instead.",
    );

  // Reuse the same validation and current consent calculation as a new draft.
  const created = createCampaign(data, input);
  const updated = { ...created.campaigns[0], id: existing.id };
  return {
    ...data,
    campaigns: data.campaigns.map((campaign) =>
      campaign.id === existing.id ? updated : campaign,
    ),
  };
}

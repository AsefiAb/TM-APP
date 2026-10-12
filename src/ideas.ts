import type { CampaignGoal } from "./sam";

/**
 * Campaign ideas and a simple impact estimate. The only external figure is the
 * SMS open rate advertised on textmunication.com (98%); every other number is
 * the owner's own input and is shown as an estimate, never a promise.
 */
export const SMS_OPEN_RATE = 0.98;
/** Default message cost: the Run plan overage rate on textmunication.com/pricing. */
export const DEFAULT_COST_PER_MESSAGE = 0.035;

export type CampaignEstimate = {
  /** Share of reached subscribers expected to act, 0–1. */
  redemptionRate: number;
  /** Average sale in dollars from one redemption. */
  averageTicket: number;
  /** Cost of one SMS segment in dollars. */
  costPerMessage: number;
};

export type CampaignIdea = {
  id: string;
  title: string;
  hook: string;
  goal: CampaignGoal;
  /** Industries from the Business step; "*" means every industry. */
  industries: string[];
  tags: string[];
  /** Builds the message from the business name and the offer value. */
  message: (businessName: string, value: number) => string;
  /** Whether the idea uses a numeric offer value (percent or dollars). */
  valueKind?: "percent" | "dollars";
  defaultValue: number;
  why: string[];
  defaults: CampaignEstimate;
  /** Suggested local send time, and the hour after which it moves to tomorrow. */
  sendAt: { hour: number; minute: number; cutoffHour: number };
};

const money = (value: number) => `$${Math.round(value)}`;

export const IDEAS: readonly CampaignIdea[] = [
  {
    id: "slow-day",
    title: "Slow-day special",
    hook: "Turn a quiet afternoon into orders with a same-day offer.",
    goal: "promotion",
    industries: ["Restaurant"],
    tags: ["Today", "Slow day"],
    valueKind: "percent",
    defaultValue: 20,
    message: (b, v) =>
      `${b}: Slow day? Not anymore. ${v}% off breadsticks and appetizers today only. Show this text when you order.`,
    why: [
      "Same-day offers create urgency; most texts are read within minutes.",
      "A small discount on a high-margin item fills a slow shift without cutting into dinner.",
      "Best sent late morning, before people decide on lunch and dinner plans.",
    ],
    defaults: { redemptionRate: 0.06, averageTicket: 18, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 11, minute: 0, cutoffHour: 15 },
  },
  {
    id: "dinner-push",
    title: "Tonight's dinner push",
    hook: "A free add-on with two entrées brings in tables tonight.",
    goal: "promotion",
    industries: ["Restaurant"],
    tags: ["Today", "Dinner"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Dinner tonight? Get a free appetizer with any two entrées until 9 PM. Show this text to your server.`,
    why: [
      "Mid-afternoon is when people decide where to eat tonight.",
      "A free add-on costs less than a discount and raises the average check.",
      "Works for walk-ins and takeout alike.",
    ],
    defaults: { redemptionRate: 0.05, averageTicket: 42, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 15, minute: 30, cutoffHour: 18 },
  },
  {
    id: "lunch-rush",
    title: "Lunch rush reminder",
    hook: "Remind nearby customers before they pick a lunch spot.",
    goal: "promotion",
    industries: ["Restaurant"],
    tags: ["Today", "Lunch"],
    valueKind: "percent",
    defaultValue: 15,
    message: (b, v) =>
      `${b}: Lunch special today: ${v}% off any combo from 11 to 2. Skip the line and order ahead.`,
    why: [
      "A 10:30 AM text lands right before the lunch decision.",
      "Combos keep the discount predictable and easy for staff to apply.",
      "Order-ahead wording reduces the lunch line.",
    ],
    defaults: { redemptionRate: 0.05, averageTicket: 14, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 10, minute: 30, cutoffHour: 13 },
  },
  {
    id: "weekend-push",
    title: "Weekend plans",
    hook: "Get on the calendar before the weekend fills up.",
    goal: "update",
    industries: ["Restaurant", "Retail", "Salon/Spa", "Health & Fitness", "Other"],
    tags: ["Weekend"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Weekend plans? We have room for you Saturday and Sunday. Reply BOOK to reserve or just come by.`,
    why: [
      "Thursday and Friday afternoon texts influence weekend plans.",
      "A reply keyword turns the message into a conversation.",
      "No discount needed; availability is the offer.",
    ],
    defaults: { redemptionRate: 0.04, averageTicket: 35, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 16, minute: 0, cutoffHour: 19 },
  },
  {
    id: "win-back",
    title: "We miss you",
    hook: "Bring back people who have not visited in a while.",
    goal: "reengage",
    industries: ["*"],
    tags: ["Win back"],
    valueKind: "percent",
    defaultValue: 15,
    message: (b, v) =>
      `${b}: It has been a while! Come back this week for ${v}% off your next visit. We saved you a spot.`,
    why: [
      "Existing customers are far cheaper to win back than new ones.",
      "A short deadline (this week) drives action without a deep discount.",
      "Send to a group of lapsed customers for the best results.",
    ],
    defaults: { redemptionRate: 0.04, averageTicket: 30, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 12, minute: 0, cutoffHour: 17 },
  },
  {
    id: "flash-sale",
    title: "Flash sale, today only",
    hook: "Clear inventory and lift a slow day with a short sale.",
    goal: "promotion",
    industries: ["Retail", "Other"],
    tags: ["Today", "Slow day"],
    valueKind: "percent",
    defaultValue: 25,
    message: (b, v) =>
      `${b}: Flash sale! ${v}% off everything in store until close today. Show this text at checkout.`,
    why: [
      "A hard end time (today) is the strongest reason to come in now.",
      "Text reaches customers faster than email or social posts.",
      "Pair with a slow weekday to even out traffic.",
    ],
    defaults: { redemptionRate: 0.05, averageTicket: 45, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 10, minute: 0, cutoffHour: 14 },
  },
  {
    id: "new-arrivals",
    title: "New arrivals",
    hook: "Give regulars first look at what just came in.",
    goal: "update",
    industries: ["Retail"],
    tags: ["Announcement"],
    defaultValue: 0,
    message: (b) =>
      `${b}: New arrivals just landed. Come see them first this week, before they go online.`,
    why: [
      "Exclusivity (first look) rewards subscribers for opting in.",
      "No discount required; novelty drives visits.",
      "Great for VIP or loyalty groups.",
    ],
    defaults: { redemptionRate: 0.03, averageTicket: 55, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 11, minute: 0, cutoffHour: 16 },
  },
  {
    id: "class-spots",
    title: "Spots open today",
    hook: "Fill today's classes or sessions in one text.",
    goal: "update",
    industries: ["Health & Fitness"],
    tags: ["Today", "Slow day"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Spots just opened in today's 5:30 PM class. Reply YES to claim yours.`,
    why: [
      "Members who see an open spot the same day are likely to act.",
      "A reply keyword makes booking effortless.",
      "Fills capacity you would otherwise lose.",
    ],
    defaults: { redemptionRate: 0.08, averageTicket: 15, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 12, minute: 0, cutoffHour: 16 },
  },
  {
    id: "bring-a-friend",
    title: "Bring a friend week",
    hook: "Grow membership through the people who already love you.",
    goal: "promotion",
    industries: ["Health & Fitness"],
    tags: ["This week"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Bring a friend free all week. They train, you both get a free guest pass. Show this text at the front desk.`,
    why: [
      "Referrals convert better than any ad.",
      "A week-long window gives members time to coordinate.",
      "Front-desk redemption is easy for staff to verify.",
    ],
    defaults: { redemptionRate: 0.04, averageTicket: 49, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 9, minute: 0, cutoffHour: 12 },
  },
  {
    id: "open-slots",
    title: "Last-minute openings",
    hook: "Fill cancellations and gaps in today's book.",
    goal: "promotion",
    industries: ["Salon/Spa", "Automotive"],
    tags: ["Today", "Slow day"],
    valueKind: "percent",
    defaultValue: 10,
    message: (b, v) =>
      `${b}: We have openings this afternoon. Book today and take ${v}% off. Reply BOOK or call us.`,
    why: [
      "Empty appointment slots are lost revenue; a small discount recovers them.",
      "Texting your list beats waiting for walk-ins.",
      "Send as soon as a cancellation happens.",
    ],
    defaults: { redemptionRate: 0.06, averageTicket: 60, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 10, minute: 30, cutoffHour: 14 },
  },
  {
    id: "service-reminder",
    title: "Seasonal service reminder",
    hook: "A timely reminder with a simple reason to book now.",
    goal: "update",
    industries: ["Automotive"],
    tags: ["Reminder"],
    valueKind: "dollars",
    defaultValue: 10,
    message: (b, v) =>
      `${b}: Time for your seasonal check-up? Book this week and save ${money(v)} on any service. Reply BOOK to schedule.`,
    why: [
      "Reminders feel helpful, not salesy, so opt-outs stay low.",
      "A small dollar saving nudges customers who were already due.",
      "Spreads bookings across the week instead of one busy day.",
    ],
    defaults: { redemptionRate: 0.04, averageTicket: 120, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 9, minute: 30, cutoffHour: 13 },
  },
  {
    id: "open-house",
    title: "Open house this weekend",
    hook: "Put a new listing in front of buyers before the weekend.",
    goal: "update",
    industries: ["Real Estate"],
    tags: ["Weekend", "Announcement"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Open house this Saturday 1 to 3 PM. New listing, great neighborhood. Reply INFO for the address and details.`,
    why: [
      "Buyers plan weekend viewings on Thursday and Friday.",
      "A reply keyword captures interest you can follow up on.",
      "Short and specific texts get more responses.",
    ],
    defaults: { redemptionRate: 0.03, averageTicket: 0, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 10, minute: 0, cutoffHour: 15 },
  },
  {
    id: "event-reminder",
    title: "Event or giving reminder",
    hook: "Remind supporters the day before with one clear ask.",
    goal: "update",
    industries: ["Non-Profit"],
    tags: ["Reminder"],
    defaultValue: 0,
    message: (b) =>
      `${b}: Tomorrow is the day! Join us at 6 PM or give online in under a minute. Reply GIVE for the link.`,
    why: [
      "Day-before reminders lift attendance and giving.",
      "One clear action keeps the message easy to act on.",
      "Keyword replies make follow-up personal.",
    ],
    defaults: { redemptionRate: 0.05, averageTicket: 40, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 11, minute: 0, cutoffHour: 17 },
  },
  {
    id: "today-only",
    title: "Today-only offer",
    hook: "A simple same-day offer for any business.",
    goal: "promotion",
    industries: ["*"],
    tags: ["Today", "Slow day"],
    valueKind: "percent",
    defaultValue: 15,
    message: (b, v) =>
      `${b}: Today only: ${v}% off when you visit before close. Show this text to redeem.`,
    why: [
      "Urgency plus a clear redemption step is the simplest formula that works.",
      "Keep it to one offer and one deadline.",
      "Send late morning so it is top of mind all day.",
    ],
    defaults: { redemptionRate: 0.05, averageTicket: 30, costPerMessage: DEFAULT_COST_PER_MESSAGE },
    sendAt: { hour: 11, minute: 0, cutoffHour: 15 },
  },
];

/** Ideas for an industry first, then ideas that fit every industry. */
export function ideasForIndustry(industry: string): CampaignIdea[] {
  const specific = IDEAS.filter((idea) => idea.industries.includes(industry));
  const generic = IDEAS.filter((idea) => idea.industries.includes("*"));
  return [...specific, ...generic.filter((idea) => !specific.includes(idea))];
}

export function getIdea(id: string): CampaignIdea | undefined {
  return IDEAS.find((idea) => idea.id === id);
}

export type ImpactInput = {
  recipients: number;
  segments: number;
  estimate: CampaignEstimate;
};

export type Impact = {
  reached: number;
  redemptions: number;
  revenue: number;
  messageCost: number;
  net: number;
};

function finiteNonNegative(value: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error(`Enter a valid ${label}.`);
}

/** A plain arithmetic projection from the owner's inputs; not a forecast. */
export function estimateImpact({ recipients, segments, estimate }: ImpactInput): Impact {
  finiteNonNegative(recipients, "number of subscribers");
  finiteNonNegative(segments, "message length");
  finiteNonNegative(estimate.redemptionRate, "redemption rate");
  if (estimate.redemptionRate > 1) throw new Error("Redemption rate cannot exceed 100%.");
  finiteNonNegative(estimate.averageTicket, "average sale");
  finiteNonNegative(estimate.costPerMessage, "message cost");
  const cents = (value: number) => Math.round(value * 100) / 100;
  const reached = Math.round(recipients * SMS_OPEN_RATE);
  const redemptions = Math.round(reached * estimate.redemptionRate);
  const revenue = cents(redemptions * estimate.averageTicket);
  const messageCost = cents(
    recipients * Math.max(1, segments) * estimate.costPerMessage,
  );
  return { reached, redemptions, revenue, messageCost, net: cents(revenue - messageCost) };
}

/** Today at the idea's suggested time, or tomorrow once the cutoff has passed. */
export function suggestedSendTime(idea: CampaignIdea, now = new Date()): Date {
  const date = new Date(now);
  date.setHours(idea.sendAt.hour, idea.sendAt.minute, 0, 0);
  const cutoff = new Date(now);
  cutoff.setHours(idea.sendAt.cutoffHour, 0, 0, 0);
  if (now.getTime() >= cutoff.getTime() || date.getTime() <= now.getTime())
    date.setDate(date.getDate() + 1);
  return date;
}

export function formatMoney(value: number): string {
  const showCents = Math.abs(value) < 10 && !Number.isInteger(value);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

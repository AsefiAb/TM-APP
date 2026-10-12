/**
 * Public plan list from https://www.textmunication.com/pricing, read on
 * October 12, 2026. Shown for reference only; plans, usage, and payment are
 * managed in the owner's SAM account on the web, not inside this app.
 */
export const PLANS_CHECKED_ON = "October 12, 2026";

export type PublicPlan = {
  name: string;
  monthlyPrice: number;
  messages: number;
  overage: string;
  tagline: string;
  popular?: boolean;
};

export const PUBLIC_PLANS: readonly PublicPlan[] = [
  {
    name: "Free Trial",
    monthlyPrice: 0,
    messages: 10,
    overage: "—",
    tagline: "14-day trial with full access to all features",
  },
  {
    name: "Start",
    monthlyPrice: 29,
    messages: 750,
    overage: "$0.05 per message",
    tagline: "Perfect for individuals and small teams",
  },
  {
    name: "Walk",
    monthlyPrice: 69,
    messages: 2000,
    overage: "$0.045 per message",
    tagline: "Ideal for growing businesses",
  },
  {
    name: "Jog",
    monthlyPrice: 149,
    messages: 4500,
    overage: "$0.04 per message",
    tagline: "Best value for established businesses",
  },
  {
    name: "Run",
    monthlyPrice: 249,
    messages: 8000,
    overage: "$0.035 per message",
    tagline: "For businesses with high messaging needs",
    popular: true,
  },
  {
    name: "Sprint",
    monthlyPrice: 349,
    messages: 12000,
    overage: "$0.029 per message",
    tagline: "For high-volume messaging operations",
  },
  {
    name: "Fly",
    monthlyPrice: 485,
    messages: 25000,
    overage: "$0.025 per message",
    tagline: "For enterprise-level messaging needs",
  },
  {
    name: "To the Moon",
    monthlyPrice: 899,
    messages: 50000,
    overage: "$0.02 per message",
    tagline: "Maximum messaging capacity for large enterprises",
  },
];

export const PLAN_FEATURES = [
  "All features included",
  "SAM AI",
  "Unlimited keywords",
  "Dedicated support",
  "CRM & POS integrations",
];

import { withOptOut } from "./sam";

export type OfferKind = "percent" | "amount" | "custom";

export type OfferDraft = {
  businessName: string;
  kind: OfferKind;
  value: string;
  appliesTo: string;
  expiresOn: string;
  terms: string;
  redemptionMethod: "in-person" | "online";
  checkoutCode: string;
  checkoutUrl: string;
  checkoutReady: boolean;
};

export function emptyOfferDraft(): OfferDraft {
  return {
    businessName: "",
    kind: "percent",
    value: "",
    appliesTo: "",
    expiresOn: "",
    terms: "",
    redemptionMethod: "in-person",
    checkoutCode: "",
    checkoutUrl: "",
    checkoutReady: false,
  };
}

function validNow(now: Date): void {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Check your device date and try again.");
  }
}

/** Examples populate editable fields only after the owner chooses one. */
export function getOfferExample(
  preset: OfferKind,
  now = new Date(),
): Pick<OfferDraft, "kind" | "value" | "appliesTo" | "expiresOn" | "terms"> {
  validNow(now);
  if (!["percent", "amount", "custom"].includes(preset)) {
    throw new Error("Choose an offer example.");
  }
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + 7);
  const expiresOn = [
    String(expiry.getMonth() + 1).padStart(2, "0"),
    String(expiry.getDate()).padStart(2, "0"),
    String(expiry.getFullYear()).padStart(4, "0"),
  ].join("/");
  return {
    kind: preset,
    value:
      preset === "percent" ? "20" : preset === "amount" ? "10" : "free add-on",
    appliesTo: preset === "amount" ? "a purchase" : "next visit",
    expiresOn,
    terms: "One per customer.",
  };
}

function requiredText(value: string, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function expirationDate(value: string, now: Date): Date {
  const match =
    typeof value === "string" &&
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new Error("Enter the offer end date as MM/DD/YYYY.");
  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const expiry = new Date(0);
  expiry.setFullYear(year, month - 1, day);
  expiry.setHours(23, 59, 59, 999);
  if (
    expiry.getFullYear() !== year ||
    expiry.getMonth() !== month - 1 ||
    expiry.getDate() !== day
  ) {
    throw new Error("Choose a real calendar date for the offer to end.");
  }
  if (expiry.getTime() <= now.getTime()) {
    throw new Error("Choose today or a future date for the offer to end.");
  }
  return expiry;
}

function discountValue(value: string, kind: "percent" | "amount"): string {
  const message =
    kind === "percent"
      ? "Enter a percentage greater than 0 and up to 100, with at most 2 decimal places."
      : "Enter a positive dollar amount with at most 2 decimal places.";
  const text = requiredText(value, message);
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) {
    throw new Error(message);
  }
  const amount = Number(text);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (kind === "percent" ? amount > 100 : amount > Number.MAX_SAFE_INTEGER / 100)
  ) {
    throw new Error(message);
  }
  return kind === "percent"
    ? String(amount)
    : amount.toFixed(2).replace(/\.00$/, "");
}

function redemptionInstruction(draft: OfferDraft): string {
  if (draft.redemptionMethod === "in-person") {
    return "Ask our team to verify this offer before checkout.";
  }
  if (draft.redemptionMethod !== "online") {
    throw new Error("Choose how customers will redeem the offer.");
  }
  const urlText = requiredText(
    draft.checkoutUrl,
    "Add your existing HTTPS checkout link.",
  );
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    throw new Error(
      "Enter a valid HTTPS checkout link without a username or password.",
    );
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    /\s/u.test(urlText) ||
    Array.from(urlText).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    throw new Error(
      "Enter a valid HTTPS checkout link without a username or password.",
    );
  }
  const code = requiredText(
    draft.checkoutCode,
    "Add the discount code already set up in your checkout.",
  );
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(code)) {
    throw new Error(
      "Use a checkout code with 2–32 letters, numbers, hyphens, or underscores.",
    );
  }
  if (draft.checkoutReady !== true) {
    throw new Error(
      "Confirm that this code and its offer rules are set up in your checkout.",
    );
  }
  return `Shop ${urlText} and use code ${code} at checkout.`;
}

/** Builds editable copy only; it does not create a coupon or verify redemption. */
export function buildOfferMessage(draft: OfferDraft, now = new Date()): string {
  validNow(now);
  const businessName = requiredText(
    draft.businessName,
    "Add the business name customers will recognize.",
  );
  const appliesTo = requiredText(
    draft.appliesTo,
    "Describe what the offer applies to.",
  );
  const scope = /^next\b/i.test(appliesTo) ? `your ${appliesTo}` : appliesTo;
  let offer: string;
  if (draft.kind === "percent") {
    offer = `Enjoy ${discountValue(draft.value, "percent")}% off ${scope}.`;
  } else if (draft.kind === "amount") {
    offer = `Enjoy $${discountValue(draft.value, "amount")} off ${scope}.`;
  } else if (draft.kind === "custom") {
    const value = requiredText(
      draft.value,
      "Describe the offer customers will receive.",
    );
    offer = `Offer: ${value}. Applies to ${scope}.`;
  } else {
    throw new Error("Choose a percentage, dollar amount, or custom offer.");
  }
  const expiry = expirationDate(draft.expiresOn, now);
  const dateLabel = expiry.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const parts = [
    `${businessName}: ${offer}`,
    `Valid through ${dateLabel}.`,
    redemptionInstruction(draft),
  ];
  if (typeof draft.terms === "string" && draft.terms.trim()) {
    parts.push(draft.terms);
  }
  const message = parts.join(" ");
  if (withOptOut(message).length > 1600) {
    throw new Error(
      "Shorten the offer to 1,600 characters, including the opt-out line.",
    );
  }
  return message;
}

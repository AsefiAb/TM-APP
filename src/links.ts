import { Linking } from "react-native";

/** Verified SAM 3.0 and Textmunication destinations (checked October 12, 2026). */
export const LINKS = {
  sam: "https://sam3.txhd.io/",
  samInbox: "https://sam3.txhd.io/inbox",
  samCampaigns: "https://sam3.txhd.io/campaigns",
  samSubscribers: "https://sam3.txhd.io/subscribers/group",
  samKeywords: "https://sam3.txhd.io/subscribers/keyword",
  samAccount: "https://sam3.txhd.io/account-settings",
  samRegister: "https://sam3.txhd.io/register",
  samHelp: "https://ai.txhd.io/",
  apiDocs: "https://txhd.io/api/v1/docs/",
  pricing: "https://www.textmunication.com/pricing",
  website: "https://www.textmunication.com/",
} as const;

export const OPEN_FAILED =
  "The page could not be opened. Try again, or visit sam3.txhd.io in your browser.";

/** Opens an external page; resolves to an error message when it cannot open. */
export async function openLink(url: string): Promise<string> {
  try {
    await Linking.openURL(url);
    return "";
  } catch {
    return OPEN_FAILED;
  }
}

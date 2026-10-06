export type ReplyDrafts = Record<string, string>;

const MAX_DRAFT_LENGTH = 1600;

/** Accept saved draft text only for conversations in the restored workspace. */
export function isReplyDrafts(
  value: unknown,
  conversationIds: readonly string[],
): value is ReplyDrafts {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ids = new Set(conversationIds);
  return Object.entries(value).every(
    ([id, body]) =>
      ids.has(id) &&
      typeof body === "string" &&
      body.length <= MAX_DRAFT_LENGTH,
  );
}

/** Preserve other conversations while saving text or deliberately clearing a draft. */
export function setConversationDraft(
  drafts: ReplyDrafts,
  conversationIds: readonly string[],
  conversationId: string,
  body: string,
): ReplyDrafts {
  if (!conversationIds.includes(conversationId))
    throw new Error("This conversation could not be found.");
  if (typeof body !== "string" || body.length > MAX_DRAFT_LENGTH)
    throw new Error("Keep your reply to 1,600 characters or fewer.");
  const next = { ...drafts };
  if (body === "") delete next[conversationId];
  else next[conversationId] = body;
  return next;
}

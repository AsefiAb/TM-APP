import assert from "node:assert/strict";
import test from "node:test";
import { isReplyDrafts, setConversationDraft } from "./reply-drafts";

const ids = ["conversation-1", "conversation-2"];

test("restored reply drafts must belong to the restored conversations and contain bounded text", () => {
  assert.equal(
    isReplyDrafts({ "conversation-1": "A reply I will finish later." }, ids),
    true,
  );
  assert.equal(isReplyDrafts({}, ids), true);
  assert.equal(
    isReplyDrafts({ "conversation-1": "a".repeat(1600) }, ids),
    true,
  );
  for (const invalid of [
    null,
    [],
    new Date(),
    "draft",
    { "conversation-1": 42 },
    { "conversation-1": "a".repeat(1601) },
    { "another-workspace-conversation": "Private text" },
  ])
    assert.equal(isReplyDrafts(invalid, ids), false);
});

test("switching conversations and clearing a saved reply preserve the other drafts", () => {
  const first = setConversationDraft(
    {},
    ids,
    ids[0],
    "Thanks for asking — let me check.",
  );
  const both = setConversationDraft(
    first,
    ids,
    ids[1],
    "  I will be with you shortly.\n",
  );
  const restored: unknown = JSON.parse(JSON.stringify(both));
  assert.ok(isReplyDrafts(restored, ids));
  assert.equal(restored[ids[0]], "Thanks for asking — let me check.");
  assert.equal(restored[ids[1]], "  I will be with you shortly.\n");
  const afterReply = setConversationDraft(restored, ids, ids[0], "");
  assert.equal(Object.hasOwn(afterReply, ids[0]), false);
  assert.equal(afterReply[ids[1]], restored[ids[1]]);
  assert.deepEqual(first, {
    "conversation-1": "Thanks for asking — let me check.",
  });
});

test("invalid draft edits never alter the previous draft map", () => {
  const drafts = { "conversation-1": "Keep this thought." };
  assert.throws(
    () => setConversationDraft(drafts, ids, "unknown", "New text"),
    /conversation/,
  );
  assert.throws(
    () => setConversationDraft(drafts, ids, ids[0], "x".repeat(1601)),
    /1,600/,
  );
  assert.deepEqual(drafts, { "conversation-1": "Keep this thought." });
});

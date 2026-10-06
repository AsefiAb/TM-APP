import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Campaign,
  Contact,
  Conversation,
  getSmsInfo,
  markConversationRead,
  replyToConversation,
} from "./domain";
import { useDemo } from "./store";
import {
  Avatar,
  Badge,
  Button,
  C,
  Card,
  Chips,
  Empty,
  Icon,
  Input,
  Search,
  Section,
  ui,
} from "./ui";

export function CampaignRow({
  campaign,
  onPress,
  compact = false,
}: {
  campaign: Campaign;
  onPress: () => void;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 480;
  const draft = campaign.status === "draft";
  const scheduled = campaign.status === "scheduled";
  const badge = (
    <Badge
      label={
        draft
          ? "Draft"
          : scheduled
            ? narrow
              ? "Preview"
              : "Schedule preview"
            : "Sent"
      }
      tone={draft ? "amber" : scheduled ? "purple" : "green"}
    />
  );
  const action = draft ? "Continue" : scheduled ? "Edit preview" : "Details";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${draft ? "Edit draft" : scheduled ? "Edit local schedule preview" : "View sample campaign"} ${campaign.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.campaignRow,
        narrow && { gap: 10 },
        pressed && { backgroundColor: C.lilac },
      ]}
    >
      <View
        style={[
          s.typeIcon,
          {
            backgroundColor: draft
              ? "#FFF3E5"
              : campaign.status === "sent"
                ? "#E9F5EF"
                : C.lilac,
          },
        ]}
      >
        <Icon
          name={
            draft ? "edit-3" : campaign.status === "sent" ? "send" : "clock"
          }
          color={
            draft ? "#AA7327" : campaign.status === "sent" ? C.green : C.primary
          }
          size={19}
        />
      </View>
      <View style={ui.grow}>
        <Text style={s.rowTitle} numberOfLines={narrow ? 2 : 1}>
          {campaign.name}
        </Text>
        <Text style={s.rowMeta} numberOfLines={narrow ? 2 : 1}>
          {campaign.audience} · {campaign.recipients} people
        </Text>
        {scheduled && (
          <Text style={s.rowMeta}>Local schedule · no delivery</Text>
        )}
        {!compact && (
          <Text style={s.bodyPreview} numberOfLines={1}>
            {campaign.body}
          </Text>
        )}
        {narrow && (
          <View style={s.rowStatus}>
            {badge}
            {!compact && <Text style={s.rowLink}>{action}</Text>}
          </View>
        )}
      </View>
      {narrow ? (
        <Icon name="chevron-right" size={16} />
      ) : (
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          {badge}
          {!compact && <Text style={s.rowLink}>{action} →</Text>}
        </View>
      )}
    </Pressable>
  );
}

export function CampaignsScreen({
  onCreate,
  onOpen,
}: {
  onCreate: () => void;
  onOpen: (campaign: Campaign) => void;
}) {
  const { data } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = data.campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || c.status === filter.toLowerCase()),
  );
  return (
    <View style={ui.stack}>
      <Search value={query} onChange={setQuery} placeholder="Find a campaign" />
      <Chips
        options={["All", "Draft", "Scheduled", "Sent"]}
        value={filter}
        onChange={setFilter}
      />
      <Card>
        <Section
          title={filter === "All" ? "All campaigns" : `${filter} campaigns`}
        />
        <Text style={[ui.help, { marginBottom: 12 }]}>
          {filtered.length} campaign{filtered.length === 1 ? "" : "s"} · SMS ·
          Demo workspace
        </Text>
        {filtered.map((c) => (
          <CampaignRow key={c.id} campaign={c} onPress={() => onOpen(c)} />
        ))}
        {filtered.length === 0 && (
          <Empty
            title="A fresh start"
            body="No campaigns match this view. Start a new one or try another search."
            action="New campaign"
            onAction={onCreate}
            icon="send"
          />
        )}
      </Card>
      <View style={s.tip}>
        <Icon name="bookmark" color={C.primary} size={18} />
        <Text style={s.tipText}>
          An idea worth coming back to? Save a draft and pick up exactly where
          you left off.
        </Text>
      </View>
    </View>
  );
}

export function ConversationRow({
  conversation,
  onPress,
  selected = false,
}: {
  conversation: Conversation;
  onPress: () => void;
  selected?: boolean;
}) {
  const { data, replyDrafts } = useDemo();
  const person = data.contacts.find((c) => c.id === conversation.contactId)!;
  const last = conversation.messages[conversation.messages.length - 1];
  const draft = replyDrafts[conversation.id];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${person.name}${draft ? ", unsent draft" : ""}${conversation.unread ? ", unread" : ""}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.conversationRow,
        (selected || pressed) && { backgroundColor: "#F5F2FE" },
      ]}
    >
      <Avatar name={person.name} />
      <View style={ui.grow}>
        <View style={ui.between}>
          <Text
            style={[
              s.rowTitle,
              ui.grow,
              conversation.unread && { fontWeight: "700" },
            ]}
            numberOfLines={1}
          >
            {person.name}
          </Text>
          {conversation.unread && <View style={s.unread} />}
        </View>
        <Text
          style={[s.bodyPreview, draft && { color: C.primary }]}
          numberOfLines={1}
        >
          {draft ? `Draft: ${draft}` : last?.body || "No messages yet"}
        </Text>
        <Text style={s.timestamp}>
          {draft ? "Unsent draft · local" : `${last?.time || ""} · SMS`}
        </Text>
      </View>
    </Pressable>
  );
}

export function InboxScreen({
  onOpen,
  onNotice,
}: {
  onOpen: (c: Conversation) => void;
  onNotice: (message: string) => void;
}) {
  const { data, update } = useDemo();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const wide = width >= 1050;
  const active = data.conversations.find((c) => c.id === activeId);
  const filtered = data.conversations.filter(
    (c) =>
      (filter !== "Unread" || c.unread) &&
      `${data.contacts.find((p) => p.id === c.contactId)?.name} ${c.messages.map((m) => m.body).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const select = (c: Conversation) => {
    if (!wide) {
      onOpen(c);
      return;
    }
    setActiveId(c.id);
    update(markConversationRead(data, c.id));
  };
  return (
    <View style={ui.stack}>
      <Search
        value={query}
        onChange={setQuery}
        placeholder="Search conversations"
      />
      <Chips options={["All", "Unread"]} value={filter} onChange={setFilter} />
      <View style={[s.inboxColumns, !wide && { flexDirection: "column" }]}>
        <Card
          style={
            wide
              ? { flex: 0.85, paddingHorizontal: 12 }
              : { paddingHorizontal: 12 }
          }
        >
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                selected={c.id === activeId}
                onPress={() => select(c)}
              />
            ))
          ) : (
            <Empty
              icon="check-circle"
              title={
                filter === "Unread" ? "All caught up" : "No conversations found"
              }
              body={
                filter === "Unread"
                  ? "You have no unread conversations in this view."
                  : "Try another name or a word from the message."
              }
            />
          )}
        </Card>
        {wide && (
          <Card style={{ flex: 1.15 }}>
            {active ? (
              <>
                <View style={[ui.row, { marginBottom: 20 }]}>
                  <Avatar
                    name={
                      data.contacts.find((c) => c.id === active.contactId)!.name
                    }
                  />
                  <Text style={ui.h2}>
                    {data.contacts.find((c) => c.id === active.contactId)!.name}
                  </Text>
                </View>
                <ConversationView
                  key={active.id}
                  conversation={active}
                  onNotice={onNotice}
                />
              </>
            ) : (
              <Empty
                title="A personal reply goes a long way"
                body="Choose a conversation to see the story and reply."
                icon="message-circle"
              />
            )}
          </Card>
        )}
      </View>
    </View>
  );
}

export function ConversationView({
  conversation,
  onNotice,
}: {
  conversation: Conversation;
  onNotice: (message: string) => void;
}) {
  const { data, update, completeGuide, replyDrafts, setReplyDraft } = useDemo();
  const reply = replyDrafts[conversation.id] ?? "";
  const setReply = (value: string) => setReplyDraft(conversation.id, value);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const person = data.contacts.find((c) => c.id === conversation.contactId)!;
  const subscribed = person.consent === "subscribed";
  async function send() {
    if (saving) return;
    setSaving(true);
    setError("");
    const submittedReply = reply;
    try {
      const saved = await update(
        replyToConversation(data, conversation.id, submittedReply),
      );
      if (!saved) {
        setError(
          "Your reply is visible this session, but could not be saved on this device. Your draft has been kept.",
        );
        return;
      }
      completeGuide("reply");
      setReplyDraft(conversation.id, "", submittedReply);
      onNotice("Reply saved in your demo conversation.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={ui.stack}>
      <View style={ui.between}>
        <Text style={ui.muted}>{person.phone}</Text>
        <Badge
          label={subscribed ? "Subscribed" : "Opted out"}
          tone={subscribed ? "green" : "gray"}
        />
      </View>
      <Text style={[ui.help, { textAlign: "center" }]}>
        Demo conversation · SMS
      </Text>
      <View style={s.thread}>
        {conversation.messages.map((m) => (
          <View
            key={m.id}
            style={[
              s.bubble,
              m.direction === "outbound" ? s.outbound : s.inbound,
            ]}
          >
            <Text
              style={[
                s.bubbleBody,
                m.direction === "outbound" && { color: C.white },
              ]}
            >
              {m.body}
            </Text>
            <Text
              style={[
                s.bubbleTime,
                m.direction === "outbound" && { color: "#E2D9FC" },
              ]}
            >
              {m.time}
            </Text>
          </View>
        ))}
      </View>
      {subscribed ? (
        <>
          {!reply.trim() && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Insert a thank-you reply"
              onPress={() =>
                setReply("Thanks for reaching out! How can we help?")
              }
              style={s.quickReply}
            >
              <Icon name="corner-up-left" size={15} color={C.primary} />
              <Text style={s.quickReplyText}>Start with a thank-you</Text>
            </Pressable>
          )}
          <Input
            accessibilityLabel="Reply message"
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={1600}
            placeholder="Write a personal reply…"
          />
          <View style={{ gap: 12 }}>
            <Text style={ui.help}>
              {getSmsInfo(reply).segments} SMS segments · Local preview
            </Text>
            <Button
              title={saving ? "Saving reply…" : "Save demo reply"}
              icon="arrow-up-right"
              onPress={send}
              disabled={saving || !reply.trim()}
            />
          </View>
          <Text style={ui.help}>
            Drafts stay on this device when you leave. No text message is sent.
          </Text>
        </>
      ) : (
        <View style={s.tip}>
          <Icon name="shield" color={C.muted} />
          <Text style={s.tipText}>
            This person opted out. Replies are disabled.
          </Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function AudienceScreen({
  onOpen,
}: {
  onOpen: (contact: Contact) => void;
}) {
  const { data } = useDemo();
  const { width } = useWindowDimensions();
  const narrow = width < 480;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = data.contacts.filter(
    (c) =>
      `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        c.group === filter ||
        (filter === "Opted out" && c.consent === "unsubscribed")),
  );
  return (
    <View style={ui.stack}>
      <View style={s.audienceStats}>
        {["VIP", "Members", "Leads"].map((group, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter ${group}`}
            accessibilityState={{ selected: filter === group }}
            key={group}
            onPress={() => setFilter(group)}
            style={[
              s.groupCard,
              filter === group && { borderColor: C.primary },
            ]}
          >
            <View
              style={[
                s.groupIcon,
                { backgroundColor: ["#EEE8FD", "#E7F4EB", "#FFF0E4"][index] },
              ]}
            >
              <Icon
                name={
                  index === 0 ? "star" : index === 1 ? "users" : "user-plus"
                }
                color={[C.primary, C.green, "#B67439"][index]}
                size={19}
              />
            </View>
            <Text style={s.groupNumber}>
              {
                data.contacts.filter(
                  (c) => c.group === group && c.consent === "subscribed",
                ).length
              }
            </Text>
            <Text style={s.groupLabel}>{group}</Text>
          </Pressable>
        ))}
      </View>
      <Search
        value={query}
        onChange={setQuery}
        placeholder="Search name or phone number"
      />
      <Chips
        options={["All", "VIP", "Members", "Leads", "Opted out"]}
        value={filter}
        onChange={setFilter}
      />
      <Card>
        <Section title="Your people" />
        <Text style={[ui.help, { marginBottom: 12 }]}>
          {filtered.length} contacts · Group totals count subscribed people
        </Text>
        {filtered.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`View contact ${c.name}, ${c.consent === "subscribed" ? "subscribed" : "opted out"}`}
            onPress={() => onOpen(c)}
            style={[s.contactRow, narrow && { gap: 10 }]}
          >
            <Avatar name={c.name} size={narrow ? 40 : 44} />
            <View style={ui.grow}>
              <Text style={s.rowTitle} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={s.rowMeta}>{c.phone}</Text>
              {narrow ? (
                <View style={s.contactStatus}>
                  <Badge
                    label={
                      c.consent === "subscribed" ? "Subscribed" : "Opted out"
                    }
                    tone={c.consent === "subscribed" ? "green" : "gray"}
                  />
                  <Text style={s.groupLabel}>{c.group}</Text>
                </View>
              ) : (
                width < 720 && <Text style={s.timestamp}>{c.group}</Text>
              )}
            </View>
            {width >= 720 && <Text style={ui.muted}>{c.group}</Text>}
            {!narrow && (
              <Badge
                label={c.consent === "subscribed" ? "Subscribed" : "Opted out"}
                tone={c.consent === "subscribed" ? "green" : "gray"}
              />
            )}
            <Icon name="chevron-right" size={16} />
          </Pressable>
        ))}
        {filtered.length === 0 && (
          <Empty
            icon="search"
            title="No matches yet"
            body="Try a different name, number, or group."
          />
        )}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  campaignRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    minHeight: 82,
  },
  typeIcon: {
    width: 42,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  contactStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: C.ink, lineHeight: 22 },
  rowMeta: { fontSize: 13, color: C.muted, lineHeight: 20, marginTop: 3 },
  bodyPreview: { fontSize: 14, color: C.muted, lineHeight: 22, marginTop: 5 },
  rowLink: { fontSize: 12, color: C.primary, fontWeight: "600" },
  tip: {
    padding: 18,
    backgroundColor: "#F0EDF8",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: { fontSize: 13, lineHeight: 21, color: C.muted, flex: 1 },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 10,
    paddingVertical: 18,
    borderRadius: 13,
  },
  unread: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  timestamp: { fontSize: 12, color: C.muted, marginTop: 5 },
  inboxColumns: { flexDirection: "row", gap: 20, alignItems: "stretch" },
  thread: { gap: 16 },
  bubble: { padding: 16, borderRadius: 19, gap: 7, maxWidth: "89%" },
  outbound: {
    alignSelf: "flex-end",
    backgroundColor: "#7454CA",
    borderBottomRightRadius: 5,
  },
  inbound: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F0F5",
    borderBottomLeftRadius: 5,
  },
  bubbleBody: { fontSize: 15, lineHeight: 24, color: C.ink },
  bubbleTime: { fontSize: 11, color: C.muted, alignSelf: "flex-end" },
  quickReply: {
    minHeight: 44,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: C.lilac,
  },
  quickReplyText: { fontSize: 13, color: C.primary },
  audienceStats: { flexDirection: "row", gap: 12 },
  groupCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 18,
    gap: 11,
  },
  groupIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  groupNumber: { fontSize: 29, fontWeight: "700", color: C.ink },
  groupLabel: { fontSize: 13, color: C.muted },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 17,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Campaign,
  Contact,
  Conversation,
  createCampaign,
  getAudienceContacts,
  getSmsInfo,
  markConversationRead,
  replyToConversation,
} from "./domain";
import { useDemo } from "./store";

type IconName = React.ComponentProps<typeof Feather>["name"];
type Tab = "overview" | "campaigns" | "inbox" | "contacts" | "settings";
const C = {
  ink: "#18212E",
  muted: "#5F6E7E",
  teal: "#0B847E",
  mint: "#D8F5E9",
  border: "#E7EBEF",
  bg: "#F6F8FA",
  white: "#FFFFFF",
};
const navigation: {
  id: Tab;
  title: string;
  icon: IconName;
  route: "/" | "/campaigns" | "/inbox" | "/contacts" | "/settings";
}[] = [
  { id: "overview", title: "Overview", icon: "grid", route: "/" },
  { id: "campaigns", title: "Campaigns", icon: "send", route: "/campaigns" },
  { id: "inbox", title: "Inbox", icon: "message-circle", route: "/inbox" },
  { id: "contacts", title: "Contacts", icon: "users", route: "/contacts" },
  { id: "settings", title: "Settings", icon: "sliders", route: "/settings" },
];
const audiences: Campaign["audience"][] = [
  "All subscribers",
  "VIP",
  "Members",
  "Leads",
];
const labelStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
const number = (n: number) => n.toLocaleString();

function Icon({
  name,
  color = C.muted,
  size = 20,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}
function Action({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {icon && (
        <Icon name={icon} color={secondary ? C.ink : C.white} size={17} />
      )}
      <Text style={[s.actionText, secondary && { color: C.ink }]}>{title}</Text>
    </Pressable>
  );
}
function Pill({
  text,
  tone = "green",
}: {
  text: string;
  tone?: "green" | "gray" | "orange" | "blue";
}) {
  const colors = {
    green: ["#E5F7EE", "#227355"],
    gray: ["#EFF2F5", "#667484"],
    orange: ["#FFF3DF", "#996014"],
    blue: ["#EAF0FF", "#4B66AC"],
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: colors[0] }]}>
      <View style={[s.dot, { backgroundColor: colors[1] }]} />
      <Text style={[s.pillText, { color: colors[1] }]}>{text}</Text>
    </View>
  );
}
function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.h2}>{title}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={s.textAction}
        >
          <Text style={s.tealText}>{action}</Text>
          <Icon name="arrow-up-right" color={C.teal} size={16} />
        </Pressable>
      )}
    </View>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <View style={s.empty}>
      <Icon name="search" size={28} />
      <Text style={s.h2}>{title}</Text>
      <Text style={s.muted}>{description}</Text>
    </View>
  );
}
function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={s.search}>
      <Icon name="search" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChange}
        style={s.searchInput}
      />
    </View>
  );
}
function Choice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.choices}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          onPress={() => onChange(option)}
          style={[s.choice, option === value && s.choiceSelected]}
        >
          <Text style={[s.choiceText, option === value && { color: C.teal }]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Workspace({ tab }: { tab: Tab }) {
  const { data, ready, storageError, update, reset } = useDemo();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const roomy = width >= 740;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [composer, setComposer] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const unread = data.conversations.filter((c) => c.unread).length;
  const subscribers = data.contacts.filter(
    (c) => c.consent === "subscribed",
  ).length;
  const sent = data.campaigns.filter((c) => c.status === "sent");
  const delivered = sent.reduce((sum, c) => sum + (c.delivered ?? 0), 0);
  const recipients = sent.reduce((sum, c) => sum + c.recipients, 0);
  const replies = sent.reduce((sum, c) => sum + (c.replies ?? 0), 0);
  const activeConversation = data.conversations.find(
    (c) => c.id === conversationId,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const openConversation = (conversation: Conversation) => {
    update(markConversationRead(data, conversation.id));
    setConversationId(conversation.id);
  };
  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      setToast("Could not open this link. Please try from your browser."),
    );
  };
  const navigate = (id: Tab) => {
    const target = navigation.find((n) => n.id === id)!;
    router.replace(target.route);
  };
  const stats = [
    {
      title: "Messages delivered",
      value: number(delivered),
      note: "Across sample campaigns",
      icon: "send" as IconName,
    },
    {
      title: "Delivery rate",
      value: recipients
        ? `${((delivered / recipients) * 100).toFixed(1)}%`
        : "—",
      note: "Delivered / sent",
      icon: "check-circle" as IconName,
    },
    {
      title: "Active subscribers",
      value: number(subscribers),
      note: `${data.contacts.length - subscribers} opted out`,
      icon: "users" as IconName,
    },
    {
      title: "Campaign replies",
      value: number(replies),
      note: `${unread} unread conversations`,
      icon: "message-circle" as IconName,
    },
  ];

  function campaignRow(c: Campaign) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View campaign ${c.name}`}
        key={c.id}
        onPress={() => setSelectedCampaign(c)}
        style={({ pressed }) => [
          s.campaignRow,
          pressed && { backgroundColor: C.bg },
        ]}
      >
        <View
          style={[
            s.squareIcon,
            { backgroundColor: c.status === "sent" ? "#EAF6F3" : "#F0EEFA" },
          ]}
        >
          <Icon
            name={
              c.status === "scheduled"
                ? "clock"
                : c.status === "sent"
                  ? "send"
                  : "edit-3"
            }
            color={c.status === "sent" ? C.teal : "#7B6AA0"}
            size={19}
          />
        </View>
        <View style={s.grow}>
          <Text numberOfLines={1} style={s.rowTitle}>
            {c.name}
          </Text>
          <Text style={s.rowMeta}>
            {c.audience} · {number(c.recipients)} recipients
          </Text>
        </View>
        {desktop && (
          <Text style={[s.rowMeta, { width: 95 }]}>
            {c.status === "sent"
              ? `${c.delivered ?? 0} delivered`
              : "Local preview"}
          </Text>
        )}
        <Pill
          text={labelStatus(c.status)}
          tone={
            c.status === "sent"
              ? "green"
              : c.status === "scheduled"
                ? "blue"
                : "gray"
          }
        />
        {roomy && <Icon name="chevron-right" size={17} />}
      </Pressable>
    );
  }

  function conversationRow(c: Conversation) {
    const contact = data.contacts.find((person) => person.id === c.contactId)!;
    const last = c.messages[c.messages.length - 1];
    return (
      <Pressable
        key={c.id}
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${contact.name}`}
        onPress={() => openConversation(c)}
        style={({ pressed }) => [
          s.conversationRow,
          pressed && { backgroundColor: C.bg },
        ]}
      >
        <View
          style={[
            s.avatar,
            { backgroundColor: c.unread ? "#E5F1EC" : "#F0EFF6" },
          ]}
        >
          <Text style={s.avatarText}>{initials(contact.name)}</Text>
        </View>
        <View style={s.grow}>
          <View style={s.between}>
            <Text style={s.rowTitle}>{contact.name}</Text>
            <Text style={s.tiny}>{last?.time}</Text>
          </View>
          <Text style={s.previewText} numberOfLines={1}>
            {last?.body || "Start a conversation"}
          </Text>
        </View>
        {c.unread && (
          <View
            style={[s.dot, { backgroundColor: C.teal, width: 7, height: 7 }]}
          />
        )}
      </Pressable>
    );
  }

  if (!ready)
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <ActivityIndicator color={C.teal} />
        <Text style={s.muted}>Opening your preview workspace…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.shell}>
        {desktop && (
          <View style={s.sidebar}>
            <View style={s.brand}>
              <Image
                source={require("../assets/icon.png")}
                style={s.brandIcon}
              />
              <Text style={s.brandName}>
                textmunication<Text style={{ color: C.teal }}>.</Text>
              </Text>
            </View>
            <View style={s.workspaceCard}>
              <View style={s.workspaceAvatar}>
                <Text style={s.workspaceLetter}>Y</Text>
              </View>
              <View style={s.grow}>
                <Text style={s.rowTitle}>Your business</Text>
                <Text style={s.tiny}>Preview workspace</Text>
              </View>
              <Icon name="chevrons-down" size={15} />
            </View>
            <Text style={s.navCaption}>WORKSPACE</Text>
            <View style={{ gap: 7 }}>
              {navigation.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.title}
                  accessibilityState={{ selected: n.id === tab }}
                  onPress={() => navigate(n.id)}
                  style={[s.navItem, n.id === tab && s.navSelected]}
                >
                  <Icon
                    name={n.icon}
                    color={n.id === tab ? C.teal : C.muted}
                    size={19}
                  />
                  <Text
                    style={[
                      s.navText,
                      n.id === tab && { color: C.teal, fontWeight: "700" },
                    ]}
                  >
                    {n.title}
                  </Text>
                  {n.id === "inbox" && unread > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{unread}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={s.sidebarBottom}>
              <View style={s.helpCard}>
                <Icon name="help-circle" color={C.teal} />
                <Text style={s.rowTitle}>A little help goes a long way.</Text>
                <Text style={s.rowMeta}>Your Textmunication team is here.</Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    openLink("https://www.textmunication.com/contact-us/")
                  }
                  style={s.textAction}
                >
                  <Text style={s.tealText}>Get in touch</Text>
                  <Icon name="arrow-up-right" color={C.teal} size={15} />
                </Pressable>
              </View>
              <Text style={s.sidebarFoot}>
                Good conversations. Real connections.
              </Text>
            </View>
          </View>
        )}
        <View style={s.main}>
          <View style={[s.topbar, !desktop && { paddingHorizontal: 20 }]}>
            <View style={s.row}>
              <Text style={s.topbarTitle}>
                {desktop
                  ? navigation.find((n) => n.id === tab)?.title
                  : "textmunication."}
              </Text>
              {desktop && (
                <>
                  <Text style={s.tiny}>/</Text>
                  <Text style={s.rowMeta}>Your business</Text>
                </>
              )}
            </View>
            <View style={s.row}>
              <Pill text="Demo workspace" tone="orange" />
              <Pressable
                accessibilityLabel="Open settings"
                accessibilityRole="button"
                onPress={() => navigate("settings")}
                style={s.profile}
              >
                <Text style={s.profileText}>YB</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView
            style={s.grow}
            contentContainerStyle={[s.content, !roomy && { padding: 20 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.contentInner}>
              {!!storageError && (
                <Text accessibilityRole="alert" style={s.error}>
                  {storageError}
                </Text>
              )}
              <View
                style={[s.pageHeading, !roomy && { alignItems: "flex-start" }]}
              >
                <View style={s.grow}>
                  <Text style={s.eyebrow}>
                    {tab === "overview"
                      ? "YOUR BUSINESS, IN CONVERSATION"
                      : "TEXTMUNICATION MOBILE"}
                  </Text>
                  <Text style={[s.h1, !roomy && { fontSize: 28 }]}>
                    {
                      {
                        overview: "Every connection counts.",
                        campaigns: "Make your next move.",
                        inbox: "Keep the conversation going.",
                        contacts: "People, not just numbers.",
                        settings: "Your workspace.",
                      }[tab]
                    }
                  </Text>
                  <Text style={s.subtitle}>
                    {
                      {
                        overview:
                          "A little clarity for your next big conversation.",
                        campaigns:
                          "The right message. The right people. All in one place.",
                        inbox: "One inbox for meaningful customer connections.",
                        contacts:
                          "Find your audience and understand their preferences.",
                        settings:
                          "Manage your preview and explore the full platform.",
                      }[tab]
                    }
                  </Text>
                </View>
                {roomy && tab !== "settings" && (
                  <Action
                    title="Create campaign"
                    icon="plus"
                    onPress={() => setComposer(true)}
                  />
                )}
              </View>

              {tab === "overview" && (
                <>
                  <LinearGradient
                    colors={["#0D514E", "#123B3A", "#172F36"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[s.hero, !roomy && { padding: 24 }]}
                  >
                    <View style={[s.heroCircle, { right: -40, top: -100 }]} />
                    <View
                      style={[
                        s.heroCircle,
                        { right: 95, top: 120, width: 220, height: 220 },
                      ]}
                    />
                    <View style={[s.grow, { zIndex: 1 }]}>
                      <View style={s.heroTag}>
                        <View style={[s.dot, { backgroundColor: "#A6E7C8" }]} />
                        <Text style={s.heroTagText}>
                          BIG IDEAS. SMALL SCREEN.
                        </Text>
                      </View>
                      <Text style={[s.heroTitle, !roomy && { fontSize: 29 }]}>
                        Your next great campaign{roomy ? "\n" : " "}starts with
                        a hello.
                      </Text>
                      <Text style={s.heroSub}>
                        Reach your people. Spark a conversation.
                        {roomy ? "\n" : " "}Take your business with you.
                      </Text>
                      <View style={{ alignSelf: "flex-start", marginTop: 23 }}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setComposer(true)}
                          style={s.heroButton}
                        >
                          <Text style={s.heroButtonText}>
                            Let’s create something
                          </Text>
                          <Icon name="arrow-right" color="#194942" size={17} />
                        </Pressable>
                      </View>
                    </View>
                    {roomy && (
                      <View style={s.messageArt}>
                        <View style={s.artTop}>
                          <View style={s.artAvatar}>
                            <Icon
                              name="message-circle"
                              color="#D5F8E5"
                              size={19}
                            />
                          </View>
                          <View>
                            <Text style={s.artName}>
                              A more personal connection
                            </Text>
                            <Text style={s.artTime}>Powered by you</Text>
                          </View>
                          <Icon name="more-horizontal" color="#92B6AC" />
                        </View>
                        <View style={s.artBubble}>
                          <Text style={s.artMessage}>
                            A little something, just for you. 💚
                          </Text>
                          <Text style={s.artMessageSmall}>
                            Thanks for being part of our community.
                          </Text>
                        </View>
                        <View style={s.artReply}>
                          <Text style={s.artReplyText}>You made my day!</Text>
                          <Icon name="heart" color="#BEF5D8" size={14} />
                        </View>
                        <Text style={s.artCaption}>
                          Less broadcasting. More belonging.
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={s.sampleNote}>
                    <Icon name="info" size={13} />
                    <Text style={s.tiny}>
                      Sample data · Explore freely. No messages are sent.
                    </Text>
                  </View>
                  <View style={s.statGrid}>
                    {stats.map((stat, i) => (
                      <View
                        key={stat.title}
                        style={[s.stat, { width: roomy ? "23.7%" : "48%" }]}
                      >
                        <View style={s.between}>
                          <Text style={s.statLabel}>{stat.title}</Text>
                          <Icon
                            name={stat.icon}
                            color={i === 0 ? C.teal : C.muted}
                            size={17}
                          />
                        </View>
                        <Text style={s.statValue}>{stat.value}</Text>
                        <Text style={s.statNote}>{stat.note}</Text>
                      </View>
                    ))}
                  </View>
                  <View
                    style={[s.columns, !roomy && { flexDirection: "column" }]}
                  >
                    <View style={[s.card, { flex: 1.35 }]}>
                      <SectionTitle title="Campaign performance" />
                      <View style={s.chartSummary}>
                        <View>
                          <Text style={s.chartValue}>
                            {number(delivered)}
                            <Text style={s.chartUnit}> delivered</Text>
                          </Text>
                          <Text style={s.rowMeta}>
                            Sample campaign delivery results
                          </Text>
                        </View>
                        <View style={s.legend}>
                          <View style={[s.dot, { backgroundColor: C.teal }]} />
                          <Text style={s.tiny}>Delivered</Text>
                        </View>
                      </View>
                      <View style={s.chart}>
                        {sent.map((c, i) => (
                          <View style={s.barColumn} key={c.id}>
                            <Text style={s.barValue}>
                              {number(c.delivered ?? 0)}
                            </Text>
                            <View
                              style={[
                                s.bar,
                                {
                                  height: Math.max(
                                    12,
                                    ((c.delivered ?? 0) /
                                      Math.max(
                                        1,
                                        ...sent.map((c) => c.delivered ?? 0),
                                      )) *
                                      108,
                                  ),
                                  backgroundColor:
                                    i % 2 === 0 ? C.teal : "#91CBB7",
                                },
                              ]}
                            />
                            <Text numberOfLines={1} style={s.barLabel}>
                              {c.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={[s.card, { flex: 1 }]}>
                      <SectionTitle
                        title="Your inbox"
                        action="View all"
                        onPress={() => navigate("inbox")}
                      />
                      <View style={s.inboxCallout}>
                        <View style={s.inboxCount}>
                          <Text style={s.inboxCountText}>{unread}</Text>
                        </View>
                        <View>
                          <Text style={s.rowTitle}>
                            Conversations to catch up on
                          </Text>
                          <Text style={s.rowMeta}>
                            A quick reply makes a difference.
                          </Text>
                        </View>
                      </View>
                      {data.conversations.slice(0, 2).map(conversationRow)}
                    </View>
                  </View>
                  <View style={s.card}>
                    <SectionTitle
                      title="Recent campaigns"
                      action="View all campaigns"
                      onPress={() => navigate("campaigns")}
                    />
                    {data.campaigns.slice(0, 3).map(campaignRow)}
                  </View>
                </>
              )}

              {tab === "campaigns" && (
                <>
                  {!roomy && (
                    <Action
                      title="Create campaign"
                      icon="plus"
                      onPress={() => setComposer(true)}
                    />
                  )}
                  <View style={s.filterBar}>
                    <Search
                      value={query}
                      onChange={setQuery}
                      placeholder="Search campaigns"
                    />
                    <Text style={s.rowMeta}>
                      {data.campaigns.length} campaigns
                    </Text>
                  </View>
                  <Choice
                    options={["All", "Draft", "Scheduled", "Sent"]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <View style={s.card}>
                    <SectionTitle
                      title={
                        filter === "All"
                          ? "All campaigns"
                          : `${filter} campaigns`
                      }
                    />
                    {data.campaigns
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(query.toLowerCase()) &&
                          (filter === "All" ||
                            c.status === filter.toLowerCase()),
                      )
                      .map(campaignRow)}
                    {!data.campaigns.some(
                      (c) =>
                        c.name.toLowerCase().includes(query.toLowerCase()) &&
                        (filter === "All" || c.status === filter.toLowerCase()),
                    ) && (
                      <Empty
                        title="No campaigns here yet"
                        description="Try another filter or create your first draft."
                      />
                    )}
                  </View>
                  <View style={s.noteCard}>
                    <Icon name="shield" color={C.teal} />
                    <Text style={s.noteText}>
                      Campaign drafts and schedules stay in this demo. Connect
                      your account before delivering to real customers.
                    </Text>
                  </View>
                </>
              )}

              {tab === "inbox" && (
                <>
                  <Search
                    value={query}
                    onChange={setQuery}
                    placeholder="Search people or messages"
                  />
                  <Choice
                    options={["All", "Unread"]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <View style={s.card}>
                    <SectionTitle title="Conversations" />
                    {data.conversations
                      .filter((c) => {
                        const person = data.contacts.find(
                          (p) => p.id === c.contactId,
                        )!;
                        return (
                          (filter !== "Unread" || c.unread) &&
                          `${person.name} ${c.messages.map((m) => m.body).join(" ")}`
                            .toLowerCase()
                            .includes(query.toLowerCase())
                        );
                      })
                      .map(conversationRow)}
                    {!data.conversations.some(
                      (c) =>
                        (filter !== "Unread" || c.unread) &&
                        `${data.contacts.find((p) => p.id === c.contactId)?.name} ${c.messages.map((m) => m.body).join(" ")}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    ) && (
                      <Empty
                        title="You’re all caught up"
                        description="No conversations match this view."
                      />
                    )}
                  </View>
                  <View style={s.noteCard}>
                    <Icon name="message-circle" color={C.teal} />
                    <Text style={s.noteText}>
                      Replies in this preview are saved locally. Unsubscribed
                      contacts cannot receive a reply.
                    </Text>
                  </View>
                </>
              )}

              {tab === "contacts" && (
                <>
                  <View style={s.contactSummary}>
                    <Text style={s.contactNumber}>
                      {data.contacts.length}
                      <Text style={s.chartUnit}> contacts</Text>
                    </Text>
                    <Pill text={`${subscribers} subscribed`} />
                  </View>
                  <Search
                    value={query}
                    onChange={setQuery}
                    placeholder="Search name or phone number"
                  />
                  <Choice
                    options={["All", "VIP", "Members", "Leads", "Unsubscribed"]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <View style={s.card}>
                    {data.contacts
                      .filter(
                        (c) =>
                          `${c.name} ${c.phone}`
                            .toLowerCase()
                            .includes(query.toLowerCase()) &&
                          (filter === "All" ||
                            c.group === filter ||
                            (filter === "Unsubscribed" &&
                              c.consent === "unsubscribed")),
                      )
                      .map((c) => (
                        <Pressable
                          key={c.id}
                          accessibilityRole="button"
                          accessibilityLabel={`View contact ${c.name}`}
                          onPress={() => setSelectedContact(c)}
                          style={s.contactRow}
                        >
                          <View style={s.avatar}>
                            <Text style={s.avatarText}>{initials(c.name)}</Text>
                          </View>
                          <View style={s.grow}>
                            <Text style={s.rowTitle}>{c.name}</Text>
                            <Text style={s.rowMeta}>{c.phone}</Text>
                          </View>
                          {roomy && <Text style={s.rowMeta}>{c.group}</Text>}
                          <Pill
                            text={
                              c.consent === "subscribed"
                                ? "Subscribed"
                                : "Opted out"
                            }
                            tone={c.consent === "subscribed" ? "green" : "gray"}
                          />
                        </Pressable>
                      ))}
                    {!data.contacts.some(
                      (c) =>
                        `${c.name} ${c.phone}`
                          .toLowerCase()
                          .includes(query.toLowerCase()) &&
                        (filter === "All" ||
                          c.group === filter ||
                          (filter === "Unsubscribed" &&
                            c.consent === "unsubscribed")),
                    ) && (
                      <Empty
                        title="No contacts found"
                        description="Try another name, number, or group."
                      />
                    )}
                  </View>
                </>
              )}

              {tab === "settings" && (
                <>
                  <View style={s.card}>
                    <View style={s.accountHeader}>
                      <View
                        style={[s.workspaceAvatar, { width: 56, height: 56 }]}
                      >
                        <Text style={[s.workspaceLetter, { fontSize: 24 }]}>
                          Y
                        </Text>
                      </View>
                      <View style={s.grow}>
                        <Text style={s.h2}>Your business</Text>
                        <Text style={s.muted}>
                          Textmunication Mobile · Version 0.1.0
                        </Text>
                      </View>
                    </View>
                    <View style={s.divider} />
                    <SectionTitle title="Make it your own" />
                    <Text style={[s.muted, { lineHeight: 23 }]}>
                      You’re exploring a local preview. Account sign-in and live
                      sync are the next step. Your existing Textmunication
                      workspace is available in the web portal.
                    </Text>
                    <View style={s.buttonRow}>
                      <Action
                        title="Open Textmunication"
                        icon="external-link"
                        onPress={() => openLink("https://txhd.io/")}
                      />
                      <Action
                        title="Contact support"
                        secondary
                        icon="help-circle"
                        onPress={() =>
                          openLink("https://www.textmunication.com/contact-us/")
                        }
                      />
                    </View>
                  </View>
                  <View style={s.card}>
                    <SectionTitle title="Built for your everyday" />
                    {[
                      {
                        icon: "send" as IconName,
                        title: "Campaigns & drafts",
                        text: "Compose SMS, choose an audience, and preview a schedule.",
                      },
                      {
                        icon: "message-circle" as IconName,
                        title: "Customer conversations",
                        text: "Find messages, follow up, and keep track of unread replies.",
                      },
                      {
                        icon: "users" as IconName,
                        title: "Your audience",
                        text: "Browse groups and see subscription preferences.",
                      },
                    ].map((item) => (
                      <View key={item.title} style={s.featureRow}>
                        <View style={s.squareIcon}>
                          <Icon name={item.icon} color={C.teal} />
                        </View>
                        <View style={s.grow}>
                          <Text style={s.rowTitle}>{item.title}</Text>
                          <Text style={s.rowMeta}>{item.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={s.card}>
                    <SectionTitle title="Privacy & demo data" />
                    <Text style={[s.muted, { lineHeight: 23 }]}>
                      All names, numbers, messages, and results in this preview
                      are fictional. Changes are stored on this device. No
                      account password or API key is requested.
                    </Text>
                    <View style={s.buttonRow}>
                      <Action
                        title="Privacy policy"
                        secondary
                        icon="shield"
                        onPress={() =>
                          openLink(
                            "https://www.textmunication.com/privacy-policy",
                          )
                        }
                      />
                      <Action
                        title="Reset demo workspace"
                        secondary
                        icon="rotate-ccw"
                        onPress={() => setResetConfirm(true)}
                      />
                    </View>
                  </View>
                </>
              )}
              <View style={s.footer}>
                <Text style={s.tiny}>Made for meaningful connections.</Text>
                <Text style={s.tiny}>Textmunication Mobile · Preview</Text>
              </View>
            </View>
          </ScrollView>
          {!desktop && (
            <View style={s.bottomNav}>
              {navigation.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.title}
                  accessibilityState={{ selected: n.id === tab }}
                  style={s.bottomItem}
                  onPress={() => navigate(n.id)}
                >
                  <View
                    style={[
                      s.bottomIcon,
                      n.id === tab && { backgroundColor: "#E2F3EC" },
                    ]}
                  >
                    <Icon
                      name={n.icon}
                      color={n.id === tab ? C.teal : C.muted}
                      size={21}
                    />
                    {n.id === "inbox" && unread > 0 && (
                      <View style={s.unreadDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      s.bottomLabel,
                      n.id === tab && { color: C.teal, fontWeight: "700" },
                    ]}
                  >
                    {n.title === "Overview" ? "Home" : n.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      {!!toast && (
        <View accessibilityRole="alert" style={s.toast}>
          <Icon name="check-circle" color="#A6E7C8" size={18} />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
      <Sheet
        visible={composer}
        title="Create a campaign"
        onClose={() => setComposer(false)}
      >
        <CampaignComposer
          onSaved={() => {
            setComposer(false);
            setToast("Campaign saved in your demo workspace.");
          }}
        />
      </Sheet>
      <Sheet
        visible={!!selectedCampaign}
        title="Campaign details"
        onClose={() => setSelectedCampaign(null)}
      >
        {selectedCampaign && (
          <View style={s.form}>
            <Pill
              text={`${labelStatus(selectedCampaign.status)} · Demo`}
              tone="blue"
            />
            <Text style={s.h2}>{selectedCampaign.name}</Text>
            <Text style={s.muted}>
              {selectedCampaign.audience} · {selectedCampaign.recipients}{" "}
              recipients
            </Text>
            <View style={s.messagePreview}>
              <Text style={s.messagePreviewText}>{selectedCampaign.body}</Text>
            </View>
            {selectedCampaign.scheduledAt && (
              <Text style={s.muted}>
                Preview schedule:{" "}
                {new Date(selectedCampaign.scheduledAt).toLocaleString()}
              </Text>
            )}
            <Text style={s.muted}>
              {selectedCampaign.status === "sent"
                ? `${selectedCampaign.delivered ?? 0} delivered · ${selectedCampaign.replies ?? 0} replies (sample results)`
                : "Saved locally. This campaign will not send."}
            </Text>
            <Action
              title="Create a new campaign"
              onPress={() => {
                setSelectedCampaign(null);
                setComposer(true);
              }}
              icon="plus"
            />
          </View>
        )}
      </Sheet>
      <Sheet
        visible={!!activeConversation}
        title={
          activeConversation
            ? data.contacts.find((c) => c.id === activeConversation.contactId)!
                .name
            : "Conversation"
        }
        onClose={() => setConversationId(null)}
      >
        {activeConversation && (
          <ConversationView
            conversation={activeConversation}
            onNotice={setToast}
          />
        )}
      </Sheet>
      <Sheet
        visible={!!selectedContact}
        title="Contact details"
        onClose={() => setSelectedContact(null)}
      >
        {selectedContact && (
          <View style={s.form}>
            <View style={[s.avatar, { width: 64, height: 64 }]}>
              <Text style={[s.avatarText, { fontSize: 23 }]}>
                {initials(selectedContact.name)}
              </Text>
            </View>
            <Text style={s.h2}>{selectedContact.name}</Text>
            <Text style={s.muted}>{selectedContact.phone}</Text>
            <Text style={s.fieldLabel}>GROUP</Text>
            <Text style={s.rowTitle}>{selectedContact.group}</Text>
            <Pill
              text={labelStatus(selectedContact.consent)}
              tone={selectedContact.consent === "subscribed" ? "green" : "gray"}
            />
            <Text style={s.muted}>
              Sample subscription preference. Live consent records will come
              from your Textmunication account.
            </Text>
            {data.conversations.some(
              (c) => c.contactId === selectedContact.id,
            ) && (
              <Action
                title="View conversation"
                icon="message-circle"
                onPress={() => {
                  const c = data.conversations.find(
                    (c) => c.contactId === selectedContact.id,
                  )!;
                  setSelectedContact(null);
                  openConversation(c);
                }}
              />
            )}
          </View>
        )}
      </Sheet>
      <Sheet
        visible={resetConfirm}
        title="Reset this preview?"
        onClose={() => setResetConfirm(false)}
      >
        <View style={s.form}>
          <Text style={s.muted}>
            This replaces your local demo drafts and replies with the original
            sample data. Your Textmunication account is unaffected.
          </Text>
          <Action
            title="Reset demo data"
            onPress={() => {
              reset();
              setResetConfirm(false);
              setToast("Demo workspace reset.");
            }}
          />
          <Action
            title="Keep my changes"
            secondary
            onPress={() => setResetConfirm(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.modalBackdrop}
      >
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.h2}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={onClose}
                style={s.closeButton}
              >
                <Icon name="x" color={C.ink} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.modalBody}
            >
              {visible && children}
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CampaignComposer({ onSaved }: { onSaved: () => void }) {
  const { data, update } = useDemo();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] =
    useState<Campaign["audience"]>("All subscribers");
  const [schedule, setSchedule] = useState("Save as draft");
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | undefined>();
  const body = message.trim()
    ? `${message.trim()}\nReply STOP to opt out.`
    : "";
  const sms = getSmsInfo(body);
  const count = getAudienceContacts(data.contacts, audience).length;
  function prepare() {
    const date = schedule === "Tomorrow at 10 AM" ? new Date() : undefined;
    if (date) {
      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);
    }
    try {
      createCampaign(data, {
        name,
        body,
        audience,
        scheduledAt: date?.toISOString(),
      });
      setScheduledAt(date?.toISOString());
      setReview(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function save() {
    try {
      update(createCampaign(data, { name, body, audience, scheduledAt }));
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <View style={s.form}>
      <Pill text="Demo · No live delivery" tone="orange" />
      {review ? (
        <>
          <Text style={s.h2}>{name}</Text>
          <Text style={s.muted}>
            {audience} · {count} subscribed contacts
          </Text>
          <View style={s.messagePreview}>
            <Text style={s.messagePreviewText}>{body}</Text>
          </View>
          <Text style={s.muted}>
            {scheduledAt
              ? `Preview schedule: ${new Date(scheduledAt).toLocaleString()}`
              : "Save as a local draft"}
          </Text>
          <Text style={s.muted}>
            {sms.segments} SMS segment{sms.segments === 1 ? "" : "s"} per person
            · {count * sms.segments} estimated segments
          </Text>
          <Text style={s.helper}>
            This is a preview. No SMS is sent or scheduled with Textmunication.
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <Action title="Save to demo workspace" icon="check" onPress={save} />
          <Action
            title="Back to editing"
            secondary
            onPress={() => setReview(false)}
          />
        </>
      ) : (
        <>
          <Text style={s.fieldLabel}>CAMPAIGN NAME</Text>
          <TextInput
            accessibilityLabel="Campaign name"
            placeholder="e.g. A little thank-you"
            placeholderTextColor={C.muted}
            value={name}
            onChangeText={setName}
            maxLength={80}
            style={s.input}
          />
          <Text style={s.fieldLabel}>AUDIENCE</Text>
          <Choice
            options={audiences}
            value={audience}
            onChange={(value) => setAudience(value as Campaign["audience"])}
          />
          <Text style={s.helper}>
            {count} subscribed contacts · Opted-out contacts excluded
          </Text>
          <View style={s.between}>
            <Text style={s.fieldLabel}>YOUR MESSAGE</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setMessage(
                  "Your business: A little thank-you for being part of our community. Enjoy 20% off your next visit this week!",
                )
              }
              style={s.textAction}
            >
              <Icon name="file-text" size={14} color={C.teal} />
              <Text style={s.tealText}>Use template</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Campaign message"
            placeholder="Start a conversation…"
            placeholderTextColor={C.muted}
            multiline
            value={message}
            onChangeText={setMessage}
            maxLength={1570}
            style={[s.input, s.textarea]}
          />
          <View style={s.between}>
            <Text style={s.helper}>
              {sms.characters} units · {sms.segments} SMS · {sms.encoding}
            </Text>
            <Icon name="message-square" size={15} />
          </View>
          <Text style={s.helper}>
            “Reply STOP to opt out.” is included in the preview and segment
            count.
          </Text>
          <Text style={s.fieldLabel}>WHEN</Text>
          <Choice
            options={["Save as draft", "Tomorrow at 10 AM"]}
            value={schedule}
            onChange={setSchedule}
          />
          <Text style={s.helper}>
            Schedule preview uses your device’s local time zone.
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <Action
            title="Review campaign"
            icon="arrow-right"
            onPress={prepare}
          />
        </>
      )}
    </View>
  );
}

function ConversationView({
  conversation,
  onNotice,
}: {
  conversation: Conversation;
  onNotice: (message: string) => void;
}) {
  const { data, update } = useDemo();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const contact = data.contacts.find((c) => c.id === conversation.contactId)!;
  const optedOut = contact.consent !== "subscribed";
  function saveReply() {
    try {
      update(replyToConversation(data, conversation.id, reply));
      setReply("");
      setError("");
      onNotice("Demo reply saved locally. No SMS was sent.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <View style={s.form}>
      <View style={s.between}>
        <Text style={s.muted}>{contact.phone}</Text>
        <Pill
          text={optedOut ? "Opted out" : "Subscribed"}
          tone={optedOut ? "gray" : "green"}
        />
      </View>
      <Text style={[s.helper, { textAlign: "center" }]}>
        Sample conversation · SMS
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
                s.bubbleText,
                m.direction === "outbound" && { color: C.white },
              ]}
            >
              {m.body}
            </Text>
            <Text
              style={[
                s.bubbleTime,
                m.direction === "outbound" && { color: "#B7DDD2" },
              ]}
            >
              {m.time}
            </Text>
          </View>
        ))}
      </View>
      {optedOut ? (
        <View style={s.noteCard}>
          <Icon name="shield" />
          <Text style={s.noteText}>
            This contact opted out. Replies are disabled.
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Reply message"
            placeholder="Write a personal reply…"
            placeholderTextColor={C.muted}
            multiline
            value={reply}
            onChangeText={setReply}
            maxLength={1600}
            style={[s.input, { minHeight: 86, textAlignVertical: "top" }]}
          />
          <Text style={s.helper}>
            {getSmsInfo(reply).segments} SMS segments · Saved in this preview
            only
          </Text>
          <Action
            title="Save demo reply"
            icon="send"
            disabled={!reply.trim()}
            onPress={saveReply}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  shell: { flex: 1, flexDirection: "row" },
  grow: { flex: 1, minWidth: 0 },
  main: { flex: 1, minWidth: 0 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sidebar: {
    width: 248,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, height: 94 },
  brandIcon: { width: 29, height: 29, borderRadius: 9 },
  brandName: {
    fontSize: 18,
    letterSpacing: -0.8,
    color: C.ink,
    fontWeight: "800",
  },
  workspaceCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workspaceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF3EC",
    alignItems: "center",
    justifyContent: "center",
  },
  workspaceLetter: { fontSize: 16, fontWeight: "700", color: "#49674C" },
  navCaption: {
    color: "#9AA3AC",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 32,
    marginBottom: 16,
    paddingLeft: 13,
  },
  navItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 13,
  },
  navSelected: { backgroundColor: "#E8F5EF" },
  navText: { color: "#657282", fontWeight: "500", fontSize: 14, flex: 1 },
  badge: {
    backgroundColor: "#C9EADC",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: C.teal, fontSize: 11, fontWeight: "700" },
  sidebarBottom: { flex: 1, justifyContent: "flex-end", paddingVertical: 24 },
  helpCard: {
    backgroundColor: "#F6F8F7",
    borderRadius: 13,
    padding: 16,
    gap: 10,
  },
  sidebarFoot: {
    fontSize: 9,
    color: "#8B969B",
    marginTop: 22,
    textAlign: "center",
  },
  topbar: {
    height: 80,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topbarTitle: { fontSize: 14, fontWeight: "700", color: C.ink },
  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEECE6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: { fontSize: 11, color: "#7C745F", fontWeight: "700" },
  content: { padding: 34, paddingBottom: 20 },
  contentInner: { width: "100%", maxWidth: 1320, alignSelf: "center", gap: 23 },
  pageHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingBottom: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.9,
    color: C.teal,
    marginBottom: 10,
  },
  h1: { fontSize: 31, letterSpacing: -1.05, color: C.ink, fontWeight: "700" },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 21, marginTop: 9 },
  h2: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3, color: C.ink },
  muted: { color: C.muted, fontSize: 13, lineHeight: 21 },
  tiny: { color: C.muted, fontSize: 10, lineHeight: 16 },
  action: {
    backgroundColor: C.teal,
    borderRadius: 9,
    paddingHorizontal: 17,
    paddingVertical: 14,
    minHeight: 46,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: C.white, fontSize: 12, fontWeight: "600" },
  secondary: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  pill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  pillText: { fontSize: 10, fontWeight: "600" },
  dot: { width: 5, height: 5, borderRadius: 5 },
  hero: {
    minHeight: 266,
    borderRadius: 17,
    padding: 32,
    flexDirection: "row",
    overflow: "hidden",
    gap: 25,
    alignItems: "center",
  },
  heroCircle: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: "#FFFFFF0B",
  },
  heroTag: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    marginBottom: 14,
  },
  heroTagText: {
    color: "#A9D4C5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  heroTitle: {
    color: "#FCFFFC",
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 38,
    letterSpacing: -0.9,
  },
  heroSub: { color: "#AAD1C4", fontSize: 12, lineHeight: 20, marginTop: 11 },
  heroButton: {
    borderRadius: 7,
    backgroundColor: "#D2F6E3",
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  heroButtonText: { color: "#194942", fontWeight: "700", fontSize: 11 },
  messageArt: {
    width: 290,
    padding: 18,
    borderRadius: 15,
    borderColor: "#FFFFFF20",
    borderWidth: 1,
    backgroundColor: "#FFFFFF09",
    transform: [{ rotate: "-3deg" }],
  },
  artTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 21,
  },
  artAvatar: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#FFFFFF12",
    alignItems: "center",
    justifyContent: "center",
  },
  artName: { color: "#E1F1E7", fontSize: 9, fontWeight: "600" },
  artTime: { color: "#7CA79A", fontSize: 8, marginTop: 4 },
  artBubble: {
    padding: 13,
    borderRadius: 12,
    borderBottomLeftRadius: 3,
    backgroundColor: "#ECF7EF",
    marginRight: 10,
  },
  artMessage: { fontSize: 10, fontWeight: "600", color: "#315449" },
  artMessageSmall: {
    fontSize: 9,
    lineHeight: 15,
    color: "#57766A",
    marginTop: 4,
  },
  artReply: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 13,
    backgroundColor: "#45806C",
    padding: 13,
    borderRadius: 11,
    borderBottomRightRadius: 3,
    marginTop: 11,
  },
  artReplyText: { color: "#F1FFF7", fontSize: 10 },
  artCaption: {
    color: "#7EA997",
    fontSize: 8,
    textAlign: "center",
    marginTop: 16,
  },
  sampleNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: -12,
    marginBottom: -5,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  stat: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    borderRadius: 12,
  },
  statLabel: { color: C.muted, fontSize: 11, flexShrink: 1, lineHeight: 16 },
  statValue: {
    color: C.ink,
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -1,
    marginVertical: 14,
  },
  statNote: { color: "#637167", fontSize: 10 },
  columns: { flexDirection: "row", gap: 20 },
  card: {
    backgroundColor: C.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    padding: 21,
    overflow: "hidden",
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  textAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
  },
  tealText: { fontSize: 10, color: C.teal, fontWeight: "600" },
  chartSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartValue: {
    fontSize: 24,
    fontWeight: "700",
    color: C.ink,
    marginBottom: 4,
    letterSpacing: -0.7,
  },
  chartUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: C.muted,
    letterSpacing: 0,
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  chart: {
    height: 160,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    gap: 25,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginTop: 12,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },
  bar: {
    width: "68%",
    maxWidth: 100,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barValue: { color: C.teal, fontSize: 10, fontWeight: "600" },
  barLabel: { fontSize: 9, color: C.muted, marginBottom: 8 },
  inboxCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    backgroundColor: "#F4F8F5",
    borderRadius: 10,
    marginBottom: 6,
  },
  inboxCount: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E1F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  inboxCountText: { color: C.teal, fontWeight: "700", fontSize: 19 },
  campaignRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 77,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F4",
    paddingVertical: 12,
  },
  squareIcon: {
    width: 39,
    height: 39,
    backgroundColor: "#EDF6F2",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 12, fontWeight: "600", color: C.ink, lineHeight: 19 },
  rowMeta: { fontSize: 10, color: C.muted, lineHeight: 18, marginTop: 2 },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F4",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#65775E", fontSize: 11, fontWeight: "700" },
  previewText: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 47,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.ink,
    paddingVertical: 13,
    outlineWidth: 0,
  },
  choices: { gap: 8, alignItems: "center" },
  choice: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#EEF1F4",
    minHeight: 42,
  },
  choiceSelected: { backgroundColor: "#DFF2E9" },
  choiceText: { color: C.muted, fontSize: 11, fontWeight: "600" },
  noteCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 17,
    borderRadius: 11,
    backgroundColor: "#EBF3EE",
  },
  noteText: { flex: 1, fontSize: 11, color: "#627C70", lineHeight: 19 },
  empty: { padding: 32, alignItems: "center", gap: 13 },
  contactSummary: { flexDirection: "row", alignItems: "center", gap: 15 },
  contactNumber: { fontSize: 32, fontWeight: "700", color: C.ink },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  accountHeader: { flexDirection: "row", alignItems: "center", gap: 15 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 24 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 21 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 14,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 4,
  },
  bottomNav: {
    flexDirection: "row",
    paddingTop: 7,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.white,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
    gap: 4,
    minHeight: 54,
  },
  bottomIcon: {
    width: 45,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomLabel: { fontSize: 9, color: C.muted },
  unreadDot: {
    position: "absolute",
    right: 7,
    top: 1,
    width: 6,
    height: 6,
    backgroundColor: C.teal,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#132B3866",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modalSafe: { width: "100%", maxWidth: 590, maxHeight: "95%" },
  modalCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 21,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: C.bg,
  },
  modalBody: { padding: 24 },
  form: { gap: 16 },
  fieldLabel: {
    fontSize: 10,
    color: "#657880",
    letterSpacing: 1,
    fontWeight: "700",
  },
  input: {
    borderColor: "#DDE5E8",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 13,
    color: C.ink,
    backgroundColor: "#FCFDFD",
    minHeight: 46,
  },
  textarea: { minHeight: 130, textAlignVertical: "top", lineHeight: 22 },
  helper: { fontSize: 10, lineHeight: 17, color: C.muted },
  error: {
    color: "#A34D38",
    fontSize: 12,
    padding: 12,
    backgroundColor: "#FFF0E9",
    borderRadius: 8,
    lineHeight: 19,
  },
  messagePreview: {
    backgroundColor: "#EBF5EE",
    padding: 20,
    borderRadius: 15,
    borderBottomLeftRadius: 4,
  },
  messagePreviewText: { color: "#315F4A", fontSize: 14, lineHeight: 24 },
  thread: { gap: 14, paddingVertical: 14 },
  bubble: { maxWidth: "86%", padding: 15, borderRadius: 15, gap: 8 },
  outbound: {
    alignSelf: "flex-end",
    backgroundColor: "#247D70",
    borderBottomRightRadius: 3,
  },
  inbound: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F3F5",
    borderBottomLeftRadius: 3,
  },
  bubbleText: { fontSize: 13, lineHeight: 21, color: C.ink },
  bubbleTime: { fontSize: 9, color: C.muted, alignSelf: "flex-end" },
  toast: {
    position: "absolute",
    bottom: 85,
    alignSelf: "center",
    maxWidth: "90%",
    borderRadius: 12,
    backgroundColor: "#193D35",
    paddingHorizontal: 19,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toastText: { color: C.white, fontSize: 12, flexShrink: 1, lineHeight: 19 },
});

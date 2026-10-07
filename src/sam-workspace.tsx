import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAccess } from "./access";
import {
  Campaign,
  Contact,
  Conversation,
  markConversationRead,
} from "./domain";
import { CampaignGoal, CampaignSeed, campaignToSeed } from "./sam";
import { BillingScreen } from "./billing";
import { useDemo } from "./store";
import { CampaignComposer } from "./campaign-composer";
import {
  AudienceScreen,
  CampaignRow,
  CampaignsScreen,
  ConversationRow,
  ConversationView,
  InboxScreen,
} from "./screens";
import {
  Avatar,
  Badge,
  Brand,
  Button,
  C,
  Card,
  Icon,
  IconName,
  Section,
  Sheet,
  ui,
} from "./ui";

type Tab =
  | "overview"
  | "campaigns"
  | "inbox"
  | "contacts"
  | "billing"
  | "settings";
const nav: {
  id: Tab;
  label: string;
  icon: IconName;
  route: "/" | "/campaigns" | "/inbox" | "/contacts" | "/billing";
}[] = [
  { id: "overview", label: "Home", icon: "home", route: "/" },
  { id: "campaigns", label: "Campaigns", icon: "send", route: "/campaigns" },
  { id: "inbox", label: "Inbox", icon: "message-circle", route: "/inbox" },
  { id: "contacts", label: "Audience", icon: "users", route: "/contacts" },
  { id: "billing", label: "Billing", icon: "credit-card", route: "/billing" },
];
const pageCopy = {
  overview: [
    "Dashboard",
    "Send a campaign, answer a customer, get on with your day.",
  ],
  campaigns: [
    "Campaigns",
    "Create something new, or pick up where you left off.",
  ],
  inbox: ["Inbox", "A simple space for real conversations."],
  contacts: ["Subscribers", "The people behind every conversation."],
  billing: ["Billing", "Your plan, message usage, and invoices in one place."],
  settings: [
    "Account settings",
    "Your workspace, preferences, and a little help.",
  ],
};
type ComposerState = {
  initial?: Campaign;
  seed?: CampaignSeed;
  goal?: CampaignGoal;
} | null;

export function Workspace({ tab }: { tab: Tab }) {
  const { leaveDemo } = useAccess();
  const {
    data,
    ready,
    storageError,
    guide,
    showGuide,
    completeGuide,
    update,
    reset,
  } = useDemo();
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const roomy = width >= 780;
  const [composer, setComposer] = useState<ComposerState>(null);
  const [composerDirty, setComposerDirty] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [help, setHelp] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const unread = data.conversations.filter((c) => c.unread).length;
  const drafts = data.campaigns.filter((c) => c.status === "draft");
  const activeConversation = data.conversations.find(
    (c) => c.id === conversationId,
  );
  const subscribers = data.contacts.filter(
    (c) => c.consent === "subscribed",
  ).length;
  const sent = data.campaigns.filter((c) => c.status === "sent");
  const delivered = sent.reduce((n, c) => n + (c.delivered ?? 0), 0);
  const recipients = sent.reduce((n, c) => n + c.recipients, 0);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  function navigate(next: Tab) {
    if (next === "settings") router.replace("/settings");
    else router.replace(nav.find((n) => n.id === next)!.route);
  }
  function create(goal?: CampaignGoal) {
    setComposerDirty(false);
    setDiscardConfirm(false);
    setComposer({ goal });
  }
  function openCampaign(c: Campaign) {
    if (c.status === "sent") setDetail(c);
    else {
      setComposerDirty(false);
      setDiscardConfirm(false);
      setComposer({ initial: c });
    }
  }
  function closeComposer() {
    if (discardConfirm) {
      setDiscardConfirm(false);
      return;
    }
    if (composerDirty) setDiscardConfirm(true);
    else setComposer(null);
  }
  function openConversation(c: Conversation) {
    update(markConversationRead(data, c.id));
    setConversationId(c.id);
  }
  function openLink(url: string) {
    Linking.openURL(url).catch(() =>
      setToast("The link could not open. Please try in your browser."),
    );
  }
  function saveComplete() {
    setComposer(null);
    setComposerDirty(false);
    setDiscardConfirm(false);
    completeGuide("campaign");
    setToast("Campaign saved. You can come back to it anytime.");
  }

  if (!ready)
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <Brand />
        <ActivityIndicator color={C.primary} />
        <Text style={ui.muted}>Getting your workspace ready…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.shell}>
        {desktop && (
          <ScrollView style={s.sidebar} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={s.sidebarBrand}>
              <Brand />
            </View>
            <View style={s.workspacePicker}>
              <View style={s.workspaceLetter}>
                <Text
                  style={{ color: C.primary, fontSize: 17, fontWeight: "700" }}
                >
                  Y
                </Text>
              </View>
              <View style={ui.grow}>
                <Text style={s.businessName}>Your business</Text>
                <Text style={s.smallMuted}>Demo workspace</Text>
              </View>
              <Icon name="chevron-down" size={16} />
            </View>
            <Text style={s.navEyebrow}>YOUR WORKSPACE</Text>
            {nav.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                accessibilityLabel={n.label}
                accessibilityState={{ selected: tab === n.id }}
                onPress={() => navigate(n.id)}
                style={[s.navItem, tab === n.id && s.activeNav]}
              >
                <Icon
                  name={n.icon}
                  color={tab === n.id ? C.primary : C.muted}
                />
                <Text
                  style={[
                    s.navText,
                    tab === n.id && { color: C.primary, fontWeight: "700" },
                  ]}
                >
                  {n.label}
                </Text>
                {n.id === "inbox" && unread > 0 && (
                  <View style={s.navCount}>
                    <Text style={s.navCountText}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            ))}
            <View style={s.sidebarBottom}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Help and quick start"
                onPress={() => setHelp(true)}
                style={s.navItem}
              >
                <Icon name="help-circle" />
                <Text style={s.navText}>Help & quick start</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => navigate("settings")}
                style={[s.navItem, tab === "settings" && s.activeNav]}
              >
                <Icon name="settings" />
                <Text style={s.navText}>Settings</Text>
              </Pressable>
              <Text style={s.sidebarFoot}>
                Built for a more personal connection.
              </Text>
            </View>
          </ScrollView>
        )}
        <View style={s.main}>
          <View style={[s.topbar, !desktop && { paddingHorizontal: 20 }]}>
            {desktop ? (
              <View style={ui.row}>
                <Text style={s.topbarTitle}>
                  {tab === "settings"
                    ? "Settings"
                    : nav.find((n) => n.id === tab)?.label}
                </Text>
                <Text style={s.smallMuted}>/</Text>
                <Text style={s.smallMuted}>Your business</Text>
              </View>
            ) : (
              <Brand compact />
            )}
            <View style={[ui.row, { gap: 10 }]}>
              <Badge label="Demo" tone="purple" />
              {roomy && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Help and quick start"
                  onPress={() => setHelp(true)}
                  style={s.iconButton}
                >
                  <Icon name="help-circle" color={C.muted} size={21} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => navigate("settings")}
                style={s.profile}
              >
                <Text style={s.profileText}>YB</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView
            style={ui.grow}
            contentContainerStyle={[s.content, !roomy && { padding: 20 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.contentInner}>
              {!!storageError && (
                <Text accessibilityRole="alert" style={ui.error}>
                  {storageError}
                </Text>
              )}
              <View style={[ui.between, { gap: 20, alignItems: "flex-start" }]}>
                <View style={ui.grow}>
                  <View style={s.helloLabel}>
                    <View style={s.liveDot} />
                    <Text style={s.helloText}>
                      {tab === "overview"
                        ? "YOUR DAY, SIMPLIFIED"
                        : "SAM AI · YOUR BUSINESS"}
                    </Text>
                  </View>
                  <Text
                    accessibilityRole="header"
                    style={[
                      s.pageTitle,
                      !roomy && { fontSize: 29, lineHeight: 37 },
                    ]}
                  >
                    {pageCopy[tab][0]}
                  </Text>
                  <Text style={[ui.muted, { marginTop: 8 }]}>
                    {pageCopy[tab][1]}
                  </Text>
                </View>
                {roomy && tab !== "settings" && tab !== "billing" && (
                  <Button
                    title="New campaign"
                    icon="plus"
                    onPress={() => create()}
                  />
                )}
              </View>

              {tab === "overview" && (
                <>
                  <View style={[s.writerHero, !roomy && { padding: 23 }]}>
                    <View style={[s.heroGlow, { right: -120, top: -180 }]} />
                    <View
                      style={[
                        s.heroGlow,
                        {
                          right: 40,
                          top: 100,
                          width: 220,
                          height: 220,
                          backgroundColor: "#F0F8FC",
                        },
                      ]}
                    />
                    <View style={[ui.grow, { zIndex: 1 }]}>
                      <View style={s.writerLabel}>
                        <View style={s.sparkBadge}>
                          <Icon name="zap" color={C.primary} size={16} />
                        </View>
                        <Text style={s.writerLabelText}>
                          YOUR NEXT CAMPAIGN STARTS HERE
                        </Text>
                      </View>
                      <Text
                        style={[
                          s.heroTitle,
                          !roomy && { fontSize: 28, lineHeight: 36 },
                        ]}
                      >
                        Reach your people.{"\n"}Grow your business.
                      </Text>
                      <Text style={s.heroBody}>
                        One message. The right audience. A clear review before
                        you send. SAM can help with the words.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Create a campaign"
                        onPress={() => create()}
                        style={({ pressed }) => [
                          s.promptBox,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Icon name="edit-3" color={C.primary} size={18} />
                        <Text style={s.promptText}>Create a campaign</Text>
                        <View style={s.promptArrow}>
                          <Icon
                            name="arrow-up-right"
                            color={C.white}
                            size={18}
                          />
                        </View>
                      </Pressable>
                      <Text style={s.writerMode}>
                        Message → Audience → Review
                      </Text>
                    </View>
                    {roomy && (
                      <View style={s.heroArt}>
                        <View style={s.orb}>
                          <View style={s.orbInner}>
                            <Icon
                              name="message-square"
                              size={76}
                              color={C.primary}
                            />
                          </View>
                        </View>
                        <View
                          style={[
                            s.floatingTag,
                            {
                              left: 0,
                              top: 26,
                              transform: [{ rotate: "-8deg" }],
                            },
                          ]}
                        >
                          <View style={s.tagDot} />
                          <Text style={s.floatingTagText}>
                            Ready when you are
                          </Text>
                        </View>
                        <View
                          style={[
                            s.floatingTag,
                            {
                              right: -3,
                              bottom: 31,
                              transform: [{ rotate: "5deg" }],
                            },
                          ]}
                        >
                          <Icon
                            name="message-circle"
                            color={C.accent}
                            size={17}
                          />
                          <Text style={s.floatingTagText}>
                            Your business, in motion
                          </Text>
                        </View>
                        <View style={s.orbitRing} />
                      </View>
                    )}
                  </View>
                  <View style={[s.goalGrid, !roomy && { gap: 10 }]}>
                    {[
                      {
                        id: "inbox",
                        title: "Reply to customers",
                        description:
                          unread > 0
                            ? `${unread} awaiting a reply`
                            : "Your inbox is caught up",
                        icon: "message-circle",
                        action: () => navigate("inbox"),
                      },
                      {
                        id: "draft",
                        title: "Continue a draft",
                        description:
                          drafts.length > 0
                            ? `${drafts.length} saved ideas, ready to finish`
                            : "Start a message and save it for later",
                        icon: "edit-3",
                        action: () =>
                          drafts[0] ? openCampaign(drafts[0]) : create(),
                      },
                      {
                        id: "billing",
                        title: "Check billing",
                        description: "Plan, usage, and invoices",
                        icon: "credit-card",
                        action: () => navigate("billing"),
                      },
                    ].map((action, index) => (
                      <Pressable
                        key={action.id}
                        accessibilityRole="button"
                        accessibilityLabel={action.title}
                        onPress={action.action}
                        style={({ pressed }) => [
                          s.goalCard,
                          !roomy && { padding: 12 },
                          pressed && { borderColor: C.primary },
                        ]}
                      >
                        <View
                          style={[
                            s.goalIcon,
                            {
                              backgroundColor: [
                                "#EAF5FC",
                                "#F8EDF4",
                                "#EAF3F8",
                              ][index],
                            },
                          ]}
                        >
                          <Icon
                            name={action.icon as IconName}
                            color={[C.primary, C.accent, "#417E9D"][index]}
                            size={19}
                          />
                        </View>
                        <Text style={s.goalTitle}>{action.title}</Text>
                        {roomy && (
                          <Text style={s.goalDescription}>
                            {action.description}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                  <View
                    style={[
                      s.homeColumns,
                      !roomy && { flexDirection: "column" },
                    ]}
                  >
                    <View style={{ flex: 1.15, gap: 20 }}>
                      <Card>
                        <Section title="A little attention goes a long way" />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="View unread conversations"
                          onPress={() => navigate("inbox")}
                          style={s.attentionRow}
                        >
                          <View
                            style={[
                              s.attentionIcon,
                              { backgroundColor: "#EAF5FC" },
                            ]}
                          >
                            <Icon name="message-circle" color={C.primary} />
                          </View>
                          <View style={ui.grow}>
                            <Text style={s.attentionTitle}>
                              {unread > 0
                                ? `${unread} conversation${unread === 1 ? "" : "s"} waiting for you`
                                : "Your inbox is all caught up"}
                            </Text>
                            <Text style={s.attentionSub}>
                              {unread > 0
                                ? "A thoughtful reply makes a difference."
                                : "Keep the good conversations going."}
                            </Text>
                          </View>
                          <Icon name="arrow-up-right" size={18} />
                        </Pressable>
                        <View style={s.hairline} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Continue your latest draft"
                          onPress={() =>
                            drafts[0] ? openCampaign(drafts[0]) : create()
                          }
                          style={s.attentionRow}
                        >
                          <View
                            style={[
                              s.attentionIcon,
                              { backgroundColor: "#FFF2E4" },
                            ]}
                          >
                            <Icon name="edit-3" color="#B27B3A" />
                          </View>
                          <View style={ui.grow}>
                            <Text style={s.attentionTitle}>
                              {drafts.length > 0
                                ? "An idea ready for its next chapter"
                                : "Your next campaign starts here"}
                            </Text>
                            <Text numberOfLines={1} style={s.attentionSub}>
                              {drafts[0]?.name ||
                                "Create a draft in three simple steps."}
                            </Text>
                          </View>
                          <Icon name="arrow-up-right" size={18} />
                        </Pressable>
                      </Card>
                      {!guide.hidden && (
                        <Card style={s.guideCard}>
                          <View style={ui.between}>
                            <View style={ui.grow}>
                              <Text style={s.guideTitle}>
                                Make yourself at home
                              </Text>
                              <Text style={s.smallMuted}>
                                {guide.completed.length} of 3 first steps
                                complete
                              </Text>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Dismiss getting-started guide"
                              onPress={() => showGuide(false)}
                              style={s.iconButton}
                            >
                              <Icon name="x" size={18} />
                            </Pressable>
                          </View>
                          <View style={s.progressTrack}>
                            <View
                              style={[
                                s.progressFill,
                                {
                                  width: `${(guide.completed.length / 3) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                          {[
                            {
                              id: "writer",
                              title: "Get a writing suggestion",
                              action: () => create("promotion"),
                            },
                            {
                              id: "campaign",
                              title: "Save your first campaign",
                              action: () => create(),
                            },
                            {
                              id: "reply",
                              title: "Try a personal reply",
                              action: () =>
                                data.conversations[0]
                                  ? openConversation(data.conversations[0])
                                  : navigate("inbox"),
                            },
                          ].map((step, index) => (
                            <Pressable
                              key={step.id}
                              accessibilityRole="button"
                              onPress={step.action}
                              style={s.guideStep}
                            >
                              <View
                                style={[
                                  s.stepCircle,
                                  guide.completed.includes(step.id) && {
                                    backgroundColor: "#E5F2EB",
                                    borderColor: "#E5F2EB",
                                  },
                                ]}
                              >
                                {guide.completed.includes(step.id) ? (
                                  <Icon
                                    name="check"
                                    size={13}
                                    color={C.green}
                                  />
                                ) : (
                                  <Text style={s.stepNumber}>{index + 1}</Text>
                                )}
                              </View>
                              <Text style={s.guideStepText}>{step.title}</Text>
                              <Icon name="chevron-right" size={16} />
                            </Pressable>
                          ))}
                        </Card>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 20 }}>
                      <Card>
                        <Section title="Your business at a glance" />
                        <Text style={[ui.help, { marginBottom: 18 }]}>
                          Sample activity from your demo workspace
                        </Text>
                        <View style={s.statRow}>
                          <View style={s.statItem}>
                            <Text style={s.statValue}>{subscribers}</Text>
                            <Text style={s.statLabel}>Subscribers</Text>
                          </View>
                          <View style={s.statDivider} />
                          <View style={s.statItem}>
                            <Text style={s.statValue}>
                              {recipients
                                ? `${Math.round((delivered / recipients) * 100)}%`
                                : "—"}
                            </Text>
                            <Text style={s.statLabel}>Delivered</Text>
                          </View>
                          <View style={s.statDivider} />
                          <View style={s.statItem}>
                            <Text style={s.statValue}>
                              {data.campaigns.length}
                            </Text>
                            <Text style={s.statLabel}>Campaigns</Text>
                          </View>
                        </View>
                        <View style={s.deliveryStrip}>
                          <View style={s.deliveryLine} />
                          <View style={s.deliveryLight} />
                        </View>
                        <View style={[ui.row, { gap: 7, marginTop: 10 }]}>
                          <View
                            style={[s.liveDot, { backgroundColor: C.green }]}
                          />
                          <Text style={ui.help}>
                            {delivered} messages delivered across sample
                            campaigns
                          </Text>
                        </View>
                      </Card>
                      <Card>
                        <Section
                          title="Recent conversations"
                          action="Open inbox"
                          onAction={() => navigate("inbox")}
                        />
                        {data.conversations.slice(0, 2).map((c) => (
                          <ConversationRow
                            key={c.id}
                            conversation={c}
                            onPress={() => openConversation(c)}
                          />
                        ))}
                      </Card>
                    </View>
                  </View>
                  <Card>
                    <Section
                      title="Your latest campaigns"
                      action="View all"
                      onAction={() => navigate("campaigns")}
                    />
                    {data.campaigns.slice(0, 3).map((c) => (
                      <CampaignRow
                        key={c.id}
                        campaign={c}
                        compact
                        onPress={() => openCampaign(c)}
                      />
                    ))}
                  </Card>
                </>
              )}
              {tab === "campaigns" && (
                <>
                  {!roomy && (
                    <Button
                      title="New campaign"
                      icon="plus"
                      onPress={() => create()}
                    />
                  )}
                  <CampaignsScreen
                    onCreate={() => create()}
                    onOpen={openCampaign}
                  />
                </>
              )}
              {tab === "inbox" && (
                <InboxScreen onOpen={openConversation} onNotice={setToast} />
              )}
              {tab === "contacts" && <AudienceScreen onOpen={setContact} />}
              {tab === "billing" && (
                <BillingScreen
                  onOpenBilling={() =>
                    openLink("https://sam3.txhd.io/account-settings")
                  }
                />
              )}
              {tab === "settings" && (
                <>
                  <Card>
                    <View style={[ui.row, { marginBottom: 24 }]}>
                      <Avatar name="Your Business" size={56} />
                      <View style={ui.grow}>
                        <Text style={ui.h2}>Your business</Text>
                        <Text style={ui.muted}>
                          SAM AI Mobile · Version 0.2.0
                        </Text>
                      </View>
                    </View>
                    <Badge label="Demo workspace" tone="purple" />
                    <Text style={[ui.body, { marginTop: 18 }]}>
                      Your everyday SAM AI experience, designed for your phone.
                      Explore with fictional contacts and messages while your
                      live connection is prepared.
                    </Text>
                    <View style={s.settingsActions}>
                      <Button
                        title="Open full SAM AI"
                        icon="external-link"
                        onPress={() => openLink("https://sam3.txhd.io/")}
                      />
                      <Button
                        title="Help & quick start"
                        variant="secondary"
                        icon="help-circle"
                        onPress={() => setHelp(true)}
                      />
                    </View>
                  </Card>
                  <Card>
                    <Section title="A place for everything" />
                    {[
                      {
                        title: "Home",
                        body: "Your next steps and important conversations.",
                        icon: "home",
                      },
                      {
                        title: "Campaigns",
                        body: "Create, review, save, and revisit your ideas.",
                        icon: "send",
                      },
                      {
                        title: "Inbox",
                        body: "Reply to people and keep the conversation flowing.",
                        icon: "message-circle",
                      },
                      {
                        title: "Audience",
                        body: "Find subscribers and understand their preferences.",
                        icon: "users",
                      },
                      {
                        title: "Billing",
                        body: "Check your plan, message usage, and invoices.",
                        icon: "credit-card",
                      },
                    ].map((item) => (
                      <View key={item.title} style={s.featureRow}>
                        <View style={s.featureIcon}>
                          <Icon
                            name={item.icon as IconName}
                            color={C.primary}
                          />
                        </View>
                        <View style={ui.grow}>
                          <Text style={s.attentionTitle}>{item.title}</Text>
                          <Text style={s.attentionSub}>{item.body}</Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                  <Card>
                    <Section title="Settle in at your own pace" />
                    <Text style={ui.body}>
                      Your quick-start guide is always here if you want a
                      refresher.
                    </Text>
                    <View style={s.settingsActions}>
                      <Button
                        title="Show getting-started guide"
                        variant="secondary"
                        icon="compass"
                        onPress={() => {
                          showGuide(true);
                          navigate("overview");
                        }}
                      />
                      <Button
                        title="Privacy policy"
                        variant="ghost"
                        icon="shield"
                        onPress={() =>
                          openLink(
                            "https://www.textmunication.com/privacy-policy",
                          )
                        }
                      />
                    </View>
                  </Card>
                  <Card>
                    <Section title="About this preview" />
                    <Text style={ui.body}>
                      All data is fictional and saved on this device. Writer
                      uses editable offline templates; live AI, account sync,
                      and delivery will use your approved SAM AI integration.
                    </Text>
                    <View style={s.settingsActions}>
                      <Button
                        title="Leave demo"
                        variant="secondary"
                        icon="log-out"
                        onPress={leaveDemo}
                      />
                      <Button
                        title="Reset demo workspace"
                        variant="secondary"
                        icon="rotate-ccw"
                        onPress={() => setResetConfirm(true)}
                      />
                      <Button
                        title="Contact Textmunication"
                        variant="ghost"
                        icon="external-link"
                        onPress={() =>
                          openLink("https://www.textmunication.com/contact-us/")
                        }
                      />
                    </View>
                  </Card>
                </>
              )}
              <View style={s.footer}>
                <Text style={s.footerText}>
                  Less busywork. More connection.
                </Text>
                <Text style={s.footerText}>SAM AI · by Textmunication</Text>
              </View>
            </View>
          </ScrollView>
          {!desktop && (
            <View style={s.bottomNav}>
              {nav.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.label}
                  accessibilityState={{ selected: tab === n.id }}
                  onPress={() => navigate(n.id)}
                  style={s.bottomItem}
                >
                  <View
                    style={[
                      s.bottomIcon,
                      tab === n.id && { backgroundColor: "#EAF5FC" },
                    ]}
                  >
                    <Icon
                      name={n.icon}
                      color={tab === n.id ? C.primary : C.muted}
                      size={21}
                    />
                    {n.id === "inbox" && unread > 0 && (
                      <View style={s.bottomDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      s.bottomLabel,
                      tab === n.id && { color: C.primary, fontWeight: "700" },
                    ]}
                  >
                    {n.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      {!!toast && (
        <View accessibilityRole="alert" style={s.toast}>
          <Icon name="check-circle" color="#C5F0D8" size={20} />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
      <Sheet
        visible={!!composer}
        title={
          discardConfirm
            ? "Keep working on this idea?"
            : composer?.initial
              ? "Make it yours"
              : composer?.seed
                ? "Use again"
                : "Create a campaign"
        }
        subtitle={
          discardConfirm
            ? undefined
            : "A little guidance, every step of the way."
        }
        scrollKey={discardConfirm ? 1 : 0}
        onClose={closeComposer}
      >
        {discardConfirm && (
          <View style={ui.stack}>
            <Text style={ui.body}>
              Your changes haven’t been saved yet. Keep editing to finish your
              draft, or discard these changes.
            </Text>
            <Button
              title="Keep editing"
              onPress={() => setDiscardConfirm(false)}
            />
            <Button
              title="Discard changes"
              variant="secondary"
              onPress={() => {
                setComposer(null);
                setDiscardConfirm(false);
                setComposerDirty(false);
              }}
            />
          </View>
        )}
        {composer && (
          <View style={discardConfirm ? { display: "none" } : undefined}>
            <CampaignComposer
              key={
                composer.initial?.id ||
                (composer.seed ? "reuse" : composer.goal || "blank")
              }
              initial={composer.initial}
              seed={composer.seed}
              goal={composer.goal}
              onDirtyChange={setComposerDirty}
              onSaved={saveComplete}
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
            key={activeConversation.id}
            conversation={activeConversation}
            onNotice={setToast}
          />
        )}
      </Sheet>
      <Sheet
        visible={!!detail}
        title="Campaign details"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <View style={ui.stack}>
            <Badge label="Sent · Sample results" tone="green" />
            <Text style={ui.h2}>{detail.name}</Text>
            <Text style={ui.muted}>
              {detail.audience} · {detail.recipients} people
            </Text>
            <View style={s.messagePreview}>
              <Text style={ui.body}>{detail.body}</Text>
            </View>
            <View style={ui.row}>
              <Text style={ui.body}>{detail.delivered ?? 0} delivered</Text>
              <Text style={ui.body}>{detail.replies ?? 0} replies</Text>
            </View>
            <Text style={ui.help}>
              This campaign is sample history. It did not send from this app.
            </Text>
            <Button
              title="Use again"
              icon="rotate-ccw"
              onPress={() => {
                setDetail(null);
                setComposerDirty(false);
                setDiscardConfirm(false);
                setComposer({ seed: campaignToSeed(detail) });
              }}
            />
            <Text style={[ui.help, { textAlign: "center" }]}>
              Start a new draft with this message. Review and edit before
              saving.
            </Text>
          </View>
        )}
      </Sheet>
      <Sheet
        visible={!!contact}
        title="Contact details"
        onClose={() => setContact(null)}
      >
        {contact && (
          <View style={ui.stack}>
            <Avatar name={contact.name} size={64} />
            <Text style={ui.h2}>{contact.name}</Text>
            <Text style={ui.muted}>{contact.phone}</Text>
            <View style={ui.row}>
              <Badge label={contact.group} />
              <Badge
                label={
                  contact.consent === "subscribed" ? "Subscribed" : "Opted out"
                }
                tone={contact.consent === "subscribed" ? "green" : "gray"}
              />
            </View>
            <Text style={ui.body}>
              Subscription preferences determine who can receive your campaigns
              and replies.
            </Text>
            <Text style={ui.help}>
              Fictional contact · Live preferences will sync from SAM AI.
            </Text>
            {data.conversations.some((c) => c.contactId === contact.id) && (
              <Button
                title="View conversation"
                icon="message-circle"
                onPress={() => {
                  const c = data.conversations.find(
                    (c) => c.contactId === contact.id,
                  )!;
                  setContact(null);
                  openConversation(c);
                }}
              />
            )}
          </View>
        )}
      </Sheet>
      <Sheet
        visible={help}
        title="A little help, right here."
        subtitle="Get comfortable in a few simple steps."
        onClose={() => setHelp(false)}
      >
        <HelpContent
          onStart={() => {
            setHelp(false);
            create("promotion");
          }}
          onGuide={() => {
            setHelp(false);
            showGuide(true);
            navigate("overview");
          }}
          onPortal={() => openLink("https://sam3.txhd.io/")}
        />
      </Sheet>
      <Sheet
        visible={resetConfirm}
        title="A fresh start?"
        onClose={() => setResetConfirm(false)}
      >
        <View style={ui.stack}>
          <Text style={ui.body}>
            Reset your local demo campaigns, conversations, and guide. Your real
            SAM AI account stays untouched.
          </Text>
          <Button
            title="Reset demo data"
            onPress={() => {
              reset();
              setResetConfirm(false);
              setToast("Your demo is ready for a fresh start.");
            }}
          />
          <Button
            title="Keep my changes"
            variant="secondary"
            onPress={() => setResetConfirm(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function HelpContent({
  onStart,
  onGuide,
  onPortal,
}: {
  onStart: () => void;
  onGuide: () => void;
  onPortal: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const answers = [
    [
      "How do I create my first campaign?",
      "Start with a goal or write your own message. Choose a subscribed audience, then review the message, timing, and name. Save a draft whenever you are ready.",
    ],
    [
      "What does SAM Writer do in this preview?",
      "It gives you an editable starting point using your details and chosen tone. It works offline with templates. Live SAM AI generation will be connected through the approved API.",
    ],
    [
      "Will this send a text to anyone?",
      "No. This preview saves drafts, schedule previews, and replies on your device. It uses fictional contacts and never delivers a message.",
    ],
    [
      "Where are automations and the other SAM tools?",
      "The full SAM AI web platform has automation, reporting, integrations, and more. This companion keeps the everyday tasks close at hand.",
    ],
  ];
  return (
    <View style={ui.stack}>
      <View style={s.helpIntro}>
        <View style={s.assistGlyph}>
          <Icon name="compass" color={C.primary} />
        </View>
        <Text style={ui.h2}>You don’t need to learn everything at once.</Text>
        <Text style={ui.muted}>
          Start with one message. We’ll guide you from there.
        </Text>
      </View>
      <Button
        title="Try the guided campaign builder"
        icon="arrow-right"
        onPress={onStart}
      />
      {answers.map(([question, answer], index) => (
        <View key={question} style={s.faq}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open === index }}
            onPress={() => setOpen(open === index ? null : index)}
            style={s.faqButton}
          >
            <Text style={[ui.body, { flex: 1, fontWeight: "600" }]}>
              {question}
            </Text>
            <Icon name={open === index ? "minus" : "plus"} size={18} />
          </Pressable>
          {open === index && (
            <Text style={[ui.muted, { paddingBottom: 18, lineHeight: 24 }]}>
              {answer}
            </Text>
          )}
        </View>
      ))}
      <Button
        title="Show my getting-started guide"
        variant="secondary"
        onPress={onGuide}
      />
      <Button
        title="Open full SAM AI"
        variant="ghost"
        icon="external-link"
        onPress={onPortal}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center", gap: 24 },
  shell: { flex: 1, flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  sidebar: {
    width: 250,
    maxWidth: 250,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingHorizontal: 20,
  },
  sidebarBrand: { height: 96, justifyContent: "center", paddingLeft: 10 },
  workspacePicker: {
    padding: 13,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
  },
  workspaceLetter: {
    width: 35,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  businessName: { fontSize: 14, fontWeight: "600", color: C.ink },
  smallMuted: { fontSize: 12, color: C.muted, lineHeight: 19 },
  navEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: C.muted,
    paddingHorizontal: 13,
    marginTop: 33,
    marginBottom: 14,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    flexShrink: 0,
    paddingHorizontal: 14,
    borderRadius: 13,
    gap: 13,
    marginBottom: 7,
  },
  activeNav: { backgroundColor: "#EAF5FC" },
  navText: { fontSize: 14, color: C.muted, flex: 1 },
  navCount: {
    backgroundColor: "#DDEFF9",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 7,
  },
  navCountText: { fontSize: 11, fontWeight: "700", color: C.primary },
  sidebarBottom: {
    marginTop: "auto",
    paddingTop: 18,
    paddingBottom: 18,
    flexShrink: 0,
  },
  assistCard: {
    padding: 17,
    borderRadius: 18,
    backgroundColor: "#F7FAFC",
    gap: 12,
    marginBottom: 24,
  },
  assistGlyph: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E6F3FA",
    alignItems: "center",
    justifyContent: "center",
  },
  assistTitle: { fontSize: 15, color: C.ink, fontWeight: "600" },
  assistBody: { fontSize: 13, lineHeight: 21, color: C.muted },
  sidebarFoot: {
    fontSize: 10,
    color: C.muted,
    marginTop: 12,
    textAlign: "center",
  },
  topbar: {
    height: 82,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topbarTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  profile: {
    width: 42,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: "#F0F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: { fontSize: 12, fontWeight: "700", color: "#52616B" },
  content: { padding: 34, paddingBottom: 24 },
  contentInner: { width: "100%", maxWidth: 1240, alignSelf: "center", gap: 24 },
  helloLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 11,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary },
  helloText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: C.muted,
  },
  pageTitle: {
    fontSize: 32,
    lineHeight: 42,
    letterSpacing: -1,
    color: C.ink,
    fontWeight: "700",
  },
  writerHero: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 32,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: "#EFF7FC",
    opacity: 0.6,
  },
  writerLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  sparkBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#E6F3FA",
  },
  writerLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#42637B",
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: 35,
    fontWeight: "600",
    lineHeight: 43,
    letterSpacing: -1,
    color: "#1A202C",
  },
  heroBody: { fontSize: 14, lineHeight: 24, color: "#596675", marginTop: 13 },
  promptBox: {
    borderWidth: 1,
    borderColor: "#DDE5ED",
    borderRadius: 14,
    padding: 9,
    paddingLeft: 15,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 23,
    maxWidth: 475,
    minHeight: 58,
  },
  promptText: { fontSize: 13, color: "#596675", flex: 1 },
  promptArrow: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  writerMode: { fontSize: 11, color: "#596675", marginTop: 10 },
  heroArt: {
    width: 270,
    height: 230,
    justifyContent: "center",
    alignItems: "center",
  },
  orb: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: C.lilac,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-18deg" }],
    boxShadow:
      "inset 10px 10px 25px rgba(255,255,255,0.8), 0 22px 44px rgba(22,139,209,0.10)",
  },
  orbInner: {
    width: 151,
    height: 151,
    borderRadius: 76,
    backgroundColor: "#FFFFFF15",
    borderWidth: 1,
    borderColor: "#FFFFFF50",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingTag: {
    position: "absolute",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FFFFFFF5",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    zIndex: 2,
    boxShadow: "0 5px 18px rgba(26,32,44,0.05)",
  },
  floatingTagText: { fontSize: 11, fontWeight: "500", color: "#52616B" },
  tagDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#168BD1" },
  orbitRing: {
    position: "absolute",
    width: 246,
    height: 170,
    borderRadius: 123,
    borderWidth: 1,
    borderColor: "#BADDED77",
    transform: [{ rotate: "-30deg" }],
  },
  goalGrid: { flexDirection: "row", gap: 16 },
  goalCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 19,
    gap: 11,
  },
  goalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: { fontSize: 14, color: C.ink, fontWeight: "600", lineHeight: 20 },
  goalDescription: { fontSize: 12, lineHeight: 19, color: C.muted },
  homeColumns: { flexDirection: "row", gap: 22, alignItems: "stretch" },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 17,
  },
  attentionIcon: {
    width: 42,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionTitle: {
    fontSize: 14,
    color: C.ink,
    fontWeight: "600",
    lineHeight: 21,
  },
  attentionSub: { fontSize: 13, color: C.muted, lineHeight: 21, marginTop: 4 },
  hairline: { height: 1, backgroundColor: C.border },
  guideCard: { backgroundColor: "#FDFCF9", borderColor: "#ECE8DE" },
  guideTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.ink,
    marginBottom: 5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    backgroundColor: "#EDE9DF",
    marginTop: 19,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: "#AC9B66", borderRadius: 3 },
  guideStep: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DED8C9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontSize: 11, color: "#85765E" },
  guideStepText: { fontSize: 13, lineHeight: 20, color: "#5E5544", flex: 1 },
  statRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  statItem: { flex: 1 },
  statValue: {
    fontSize: 29,
    fontWeight: "600",
    letterSpacing: -0.8,
    color: C.ink,
  },
  statLabel: { fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 7 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 5 },
  deliveryStrip: {
    height: 7,
    borderRadius: 4,
    flexDirection: "row",
    gap: 4,
    marginTop: 28,
  },
  deliveryLine: { flex: 5, backgroundColor: "#168BD1", borderRadius: 4 },
  deliveryLight: { flex: 1, backgroundColor: "#DDEFF9", borderRadius: 4 },
  settingsActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 23,
  },
  featureRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingVertical: 15,
  },
  featureIcon: {
    width: 42,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lilac,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 4,
  },
  footerText: { fontSize: 11, color: C.muted, lineHeight: 18 },
  bottomNav: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 7,
  },
  bottomItem: { flex: 1, alignItems: "center", gap: 4, minHeight: 56 },
  bottomIcon: {
    width: 48,
    height: 30,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomLabel: { fontSize: 11, color: C.muted, lineHeight: 16 },
  bottomDot: {
    position: "absolute",
    right: 8,
    top: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    maxWidth: "90%",
    backgroundColor: "#243746",
    paddingVertical: 15,
    paddingHorizontal: 19,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 8px 32px rgba(30,20,48,0.18)",
  },
  toastText: { fontSize: 14, lineHeight: 21, color: C.white, flexShrink: 1 },
  messagePreview: { padding: 21, borderRadius: 18, backgroundColor: "#EFF7FC" },
  helpIntro: { gap: 13, paddingBottom: 5 },
  faq: { borderBottomWidth: 1, borderBottomColor: C.border },
  faqButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
});

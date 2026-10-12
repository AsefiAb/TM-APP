import React, { useEffect, useMemo, useState } from "react";
import {
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
import { INDUSTRIES } from "./auth-walkthrough";
import { SamLogo } from "./brand";
import { CampaignComposer } from "./campaign-composer";
import { CampaignResultsSheet } from "./campaign-results";
import {
  Campaign,
  deleteCampaign,
  getAudienceContacts,
  getGroups,
  markCampaignSent,
  recordCampaignResults,
} from "./domain";
import { formatMoney } from "./ideas";
import { IdeasSheet } from "./ideas-sheet";
import { CampaignSeed, campaignToSeed } from "./sam";
import { successFeedback, tapFeedback } from "./haptics";
import { LINKS, openLink } from "./links";
import { isPastDue } from "./schedule";
import { PLANS_CHECKED_ON, PLAN_FEATURES, PUBLIC_PLANS } from "./plans";
import { useWorkspace } from "./store";
import { SubscribersScreen } from "./subscribers";
import {
  Avatar,
  Badge,
  Button,
  C,
  Card,
  Chips,
  Empty,
  F,
  Icon,
  IconName,
  Input,
  PageHeader,
  R,
  Row,
  Search,
  Sheet,
  StatCard,
  t,
  ui,
} from "./ui";

export type Tab =
  | "overview"
  | "campaigns"
  | "inbox"
  | "contacts"
  | "billing"
  | "settings";

const navigation: {
  id: Tab;
  title: string;
  icon: IconName;
  route: "/" | "/campaigns" | "/inbox" | "/contacts" | "/settings";
}[] = [
  { id: "overview", title: "Dashboard", icon: "grid", route: "/" },
  { id: "campaigns", title: "Campaigns", icon: "calendar", route: "/campaigns" },
  { id: "inbox", title: "Inbox", icon: "inbox", route: "/inbox" },
  { id: "contacts", title: "Subscribers", icon: "users", route: "/contacts" },
  { id: "settings", title: "Account", icon: "settings", route: "/settings" },
];

type Confirm = {
  title: string;
  body: string;
  action: string;
  icon?: IconName;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

const STATUS_FILTERS = ["All", "Draft", "Scheduled", "Sent"] as const;

function statusLabel(campaign: Campaign) {
  return campaign.status === "draft"
    ? "Draft"
    : campaign.status === "scheduled"
      ? "Scheduled"
      : "Sent";
}

function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function sameMonth(value: string | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function Workspace({ tab }: { tab: Tab }) {
  const { business, email, signOut, updateBusiness } = useAccess();
  const { data, storageError, update, reset } = useWorkspace();
  const { width } = useWindowDimensions();
  const wide = width >= 560;
  const [composer, setComposer] = useState<{
    initial?: Campaign;
    writer?: boolean;
    seed?: CampaignSeed;
  } | null>(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [notice, setNotice] = useState("");
  const [linkError, setLinkError] = useState("");
  const [editingBusiness, setEditingBusiness] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function announce(message: string) {
    setNotice(message);
    if (message) successFeedback();
  }

  const subscribed = data.contacts.filter((c) => c.consent === "subscribed");
  const optedOut = data.contacts.filter((c) => c.consent === "unsubscribed");
  const drafts = data.campaigns.filter((c) => c.status === "draft");
  const scheduled = data.campaigns
    .filter((c) => c.status === "scheduled" && c.scheduledAt)
    .sort((a, b) => Date.parse(a.scheduledAt!) - Date.parse(b.scheduledAt!));
  const sent = data.campaigns.filter((c) => c.status === "sent");
  const loggedRevenue = sent.reduce((sum, c) => sum + (c.results?.revenue ?? 0), 0);
  const resultsCampaign = resultsId
    ? data.campaigns.find((c) => c.id === resultsId && c.status === "sent")
    : undefined;
  const now = new Date();

  function openComposer(initial?: Campaign, writer = false, seed?: CampaignSeed) {
    setDirty(false);
    setNotice("");
    setComposer({ initial, writer, seed });
  }
  function closeComposer() {
    if (dirty) {
      setConfirm({
        title: "Discard changes?",
        body: "Your campaign changes have not been saved.",
        action: "Discard changes",
        danger: true,
        onConfirm: () => {
          setComposer(null);
          setDirty(false);
        },
      });
      return;
    }
    setComposer(null);
  }
  async function open(url: string) {
    setLinkError(await openLink(url));
  }
  function requestMarkSent(campaign: Campaign) {
    setConfirm({
      title: "Mark as sent in SAM?",
      body: `Only do this after you sent “${campaign.name}” from your SAM account. The campaign moves to Sent so you can log its results.`,
      action: "Mark as sent",
      icon: "check-circle",
      onConfirm: async () => {
        await update(markCampaignSent(data, campaign.id));
        setComposer(null);
        setDirty(false);
        announce("Marked as sent. Log results from the Campaigns list when you have them.");
      },
    });
  }
  function requestDelete(campaign: Campaign) {
    setConfirm({
      title: "Delete this campaign?",
      body: `“${campaign.name}” will be removed from this device.`,
      action: "Delete campaign",
      icon: "trash-2",
      danger: true,
      onConfirm: async () => {
        await update(deleteCampaign(data, campaign.id));
        setComposer(null);
        setDirty(false);
        setNotice("Campaign deleted.");
      },
    });
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <SamLogo height={24} />
        <View style={s.headerRight}>
          <Text style={s.headerBusiness} numberOfLines={1}>
            {business.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.replace("/settings")}
            style={({ pressed }) => [s.avatarButton, pressed && s.pressed]}
          >
            <Avatar name={business.name} size={34} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={ui.grow}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {!!storageError && (
          <Text accessibilityRole="alert" style={ui.error}>
            {storageError}
          </Text>
        )}
        {!!linkError && (
          <Text accessibilityRole="alert" style={ui.error}>
            {linkError}
          </Text>
        )}
        {!!notice && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${notice} Dismiss.`}
            onPress={() => setNotice("")}
          >
            <Text accessibilityLiveRegion="polite" style={ui.notice}>
              {notice}
            </Text>
          </Pressable>
        )}

        {tab === "overview" && (
          <>
            <PageHeader
              title="Dashboard Overview"
              subtitle={`Welcome back, ${business.name}! Here are your messaging stats.`}
            >
              <Button
                title="Send Campaign"
                icon="send"
                variant="outlinePrimary"
                compact
                onPress={() => openComposer()}
              />
            </PageHeader>
            <View style={[s.grid, wide && s.gridWide]}>
              <StatCard
                label="Total Unique Subscribers"
                value={subscribed.length}
                action="Manage"
                onAction={() => router.replace("/contacts")}
                style={s.gridItem}
              />
              <StatCard
                label="Total Campaigns"
                value={data.campaigns.length}
                action="View campaigns"
                onAction={() => router.replace("/campaigns")}
                style={s.gridItem}
              />
              <StatCard
                label="Monthly Opt-ins"
                value={
                  subscribed.filter((c) => sameMonth(c.createdAt, now)).length
                }
                caption="Added this month"
                style={s.gridItem}
              />
              <StatCard
                label="Monthly Opt-outs"
                value={
                  optedOut.filter((c) => sameMonth(c.optedOutAt, now)).length
                }
                caption="Opted out this month"
                style={s.gridItem}
              />
            </View>

            <Card style={s.cardTight}>
              <View style={s.cardHeader}>
                <Text style={t.h3}>Up next</Text>
                <Text style={t.small}>
                  {scheduled.length} scheduled · {drafts.length}{" "}
                  {drafts.length === 1 ? "draft" : "drafts"}
                </Text>
              </View>
              {scheduled.length === 0 && drafts.length === 0 ? (
                <Empty
                  icon="send"
                  title="No campaigns in progress"
                  body="Prepare your first campaign. You can save a draft before you have any subscribers."
                  action="Create campaign"
                  actionIcon="plus"
                  onAction={() => openComposer()}
                />
              ) : (
                [...scheduled, ...drafts].slice(0, 4).map((campaign, index) => (
                  <Row
                    key={campaign.id}
                    first={index === 0}
                    title={campaign.name}
                    subtitle={
                      campaign.status === "scheduled" && campaign.scheduledAt
                        ? `${isPastDue(campaign) ? "Past due, reschedule" : "Scheduled"} · ${formatDate(campaign.scheduledAt, true)}`
                        : `Draft · ${campaign.audience}`
                    }
                    leading={
                      <View style={s.rowIcon}>
                        <Icon
                          name={
                            isPastDue(campaign)
                              ? "alert-circle"
                              : campaign.status === "scheduled"
                                ? "clock"
                                : "edit-3"
                          }
                          size={17}
                          color={isPastDue(campaign) ? C.amber : C.primary}
                        />
                      </View>
                    }
                    onPress={() => openComposer(campaign)}
                    accessibilityLabel={`Open ${campaign.name}`}
                  />
                ))
              )}
            </Card>

            <Card style={s.ideas}>
              <View style={s.ideasTop}>
                <View style={s.rowIcon}>
                  <Icon name="trending-up" size={18} color={C.primary} />
                </View>
                <View style={ui.grow}>
                  <Text style={t.h3}>Boost a slow day</Text>
                  <Text style={t.help}>
                    Ready-made ideas for {business.industry.toLowerCase() === "other" ? "your business" : business.industry.toLowerCase()} with a projection of what each one could bring in.
                  </Text>
                </View>
              </View>
              <Button
                title="Browse campaign ideas"
                icon="arrow-right"
                variant="outlinePrimary"
                onPress={() => setIdeasOpen(true)}
              />
              {sent.length > 0 ? (
                <Text style={t.small}>
                  {sent.filter((c) => c.results).length} of {sent.length} sent campaign{sent.length === 1 ? "" : "s"} with logged results · {formatMoney(loggedRevenue)} recorded
                </Text>
              ) : null}
            </Card>

            <Card style={s.assist}>
              <View style={s.assistIcon}>
                <Icon name="zap" color={C.primary} size={22} />
              </View>
              <Text style={s.assistTitle}>
                SAM<Text style={{ color: C.primary }}>AI</Text> Assist
              </Text>
              <Text style={[t.help, s.centerText]}>
                Need the words? Start a campaign with an offer, reconnection,
                or update example and edit every line.
              </Text>
              <Button
                title="Start with an example"
                icon="edit-3"
                compact
                onPress={() => openComposer(undefined, true)}
              />
            </Card>

            <Card style={s.cardTight}>
              <Row
                first
                title="Open SAM on the web"
                subtitle="Keywords, automated messaging, reporting, and more"
                leading={
                  <View style={s.rowIcon}>
                    <Icon name="external-link" size={17} color={C.primary} />
                  </View>
                }
                onPress={() => open(LINKS.sam)}
              />
            </Card>
          </>
        )}

        {tab === "campaigns" && (
          <CampaignsScreen
            campaigns={data.campaigns}
            counts={{ drafts: drafts.length, scheduled: scheduled.length, sent: sent.length }}
            loggedRevenue={loggedRevenue}
            onCreate={() => openComposer()}
            onIdeas={() => setIdeasOpen(true)}
            onOpen={(campaign) =>
              campaign.status === "sent" ? setResultsId(campaign.id) : openComposer(campaign)
            }
          />
        )}

        {tab === "inbox" && (
          <>
            <PageHeader
              title="Inbox"
              subtitle="Manage your conversations with subscribers"
            >
              <Button
                title="Open Inbox in SAM"
                icon="external-link"
                compact
                onPress={() => open(LINKS.samInbox)}
              />
            </PageHeader>
            <Card>
              <Empty
                icon="inbox"
                title="No conversations on this device"
                body="Replies and two-way conversations live in your SAM account. They appear here once the mobile app is connected to SAM; until then, use Inbox on the web."
              />
            </Card>
            <Card style={s.cardTight}>
              <Row
                first
                title="Automated replies and keywords"
                subtitle="Set up auto-responses in SAM → Automated Messaging"
                leading={
                  <View style={s.rowIcon}>
                    <Icon name="message-circle" size={17} color={C.primary} />
                  </View>
                }
                onPress={() => open(LINKS.sam)}
              />
              <Row
                title="SAM Help AI"
                subtitle="Ask the assistant about inbox features"
                leading={
                  <View style={s.rowIcon}>
                    <Icon name="help-circle" size={17} color={C.primary} />
                  </View>
                }
                onPress={() => open(LINKS.samHelp)}
              />
            </Card>
          </>
        )}

        {tab === "contacts" && (
          <SubscribersScreen businessName={business.name} onNotice={announce} />
        )}

        {tab === "settings" && (
          <>
            <PageHeader
              title="Account Settings"
              subtitle="Manage your business information and app preferences"
            />
            <Card style={s.cardTight}>
              <View style={s.businessRow}>
                <Avatar name={business.name} size={52} />
                <View style={ui.grow}>
                  <Text style={t.h3}>{business.name}</Text>
                  <Text style={t.small}>{business.industry}</Text>
                  {email ? (
                    <Text style={t.small} numberOfLines={1}>
                      {email}
                    </Text>
                  ) : null}
                </View>
                <Button
                  title="Edit"
                  variant="outline"
                  size="sm"
                  compact
                  onPress={() => setEditingBusiness(true)}
                />
              </View>
            </Card>

            <Card style={s.connection}>
              <View style={s.connectionTop}>
                <Icon name="smartphone" size={18} color={C.amber} />
                <Text style={[t.h3, ui.grow]}>Not connected to SAM</Text>
                <Badge label="Local" tone="amber" />
              </View>
              <Text style={t.help}>
                Campaign drafts, groups, and subscribers in this app are saved on
                this device only. Live sending, inbox sync, billing, and keyword
                opt-ins run in your SAM account on the web.
              </Text>
            </Card>

            <Card style={s.cardTight}>
              <Text style={s.cardSection}>ACCOUNT & BILLING</Text>
              <Row
                first
                title="Plan & billing"
                subtitle="Public plans and where to manage your subscription"
                leading={<Icon name="credit-card" size={18} color={C.muted} />}
                onPress={() => router.replace("/billing")}
              />
              <Row
                title="Account Information in SAM"
                subtitle="Business details, API information, users"
                leading={<Icon name="user" size={18} color={C.muted} />}
                onPress={() => open(LINKS.samAccount)}
              />
              <Text style={s.cardSection}>MESSAGING</Text>
              <Row
                title="My Numbers & keywords"
                subtitle="Sender numbers and text-to-join keywords"
                leading={<Icon name="phone" size={18} color={C.muted} />}
                onPress={() => open(LINKS.samKeywords)}
              />
              <Row
                title="Inbox in SAM"
                subtitle="Two-way conversations with subscribers"
                leading={<Icon name="inbox" size={18} color={C.muted} />}
                onPress={() => open(LINKS.samInbox)}
              />
              <Text style={s.cardSection}>REFERENCE</Text>
              <Row
                title="SAM Help AI"
                subtitle="ai.txhd.io"
                leading={<Icon name="help-circle" size={18} color={C.muted} />}
                onPress={() => open(LINKS.samHelp)}
              />
              <Row
                title="API Documentation"
                subtitle="txhd.io/api/v1/docs"
                leading={<Icon name="file-text" size={18} color={C.muted} />}
                onPress={() => open(LINKS.apiDocs)}
              />
            </Card>

            <View style={ui.stack}>
              <Button
                title="Sign out"
                icon="log-out"
                variant="outline"
                onPress={() =>
                  setConfirm({
                    title: "Sign out?",
                    body: "You will return to the welcome screen. Your drafts and subscribers stay on this device until you remove them.",
                    action: "Sign out",
                    icon: "log-out",
                    onConfirm: () => {
                      signOut();
                      router.replace("/");
                    },
                  })
                }
              />
              <Button
                title="Remove data from this device"
                icon="trash-2"
                variant="danger"
                onPress={() =>
                  setConfirm({
                    title: "Remove all data?",
                    body: "Every draft, group, and subscriber saved in this app will be deleted from this device. Your SAM account on the web is not affected.",
                    action: "Remove everything",
                    icon: "trash-2",
                    danger: true,
                    onConfirm: async () => {
                      await reset();
                      setNotice("Data on this device was removed.");
                    },
                  })
                }
              />
              <Text style={[t.small, s.centerText]}>
                SAM AI by Textmunication · Version 0.3.0
              </Text>
            </View>
          </>
        )}

        {tab === "billing" && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to account"
              onPress={() => router.replace("/settings")}
              style={({ pressed }) => [s.back, pressed && s.pressed]}
            >
              <Icon name="arrow-left" size={17} color={C.text} />
              <Text style={s.backText}>Account</Text>
            </Pressable>
            <PageHeader
              title="Plan & billing"
              subtitle="Your plan, message credits, invoices, and payment method are managed in SAM on the web."
            >
              <Button
                title="Manage in SAM"
                icon="external-link"
                compact
                onPress={() => open(LINKS.samAccount)}
              />
            </PageHeader>
            <Card style={s.connection}>
              <View style={s.connectionTop}>
                <Icon name="credit-card" size={18} color={C.amber} />
                <Text style={[t.h3, ui.grow]}>Billing not connected</Text>
              </View>
              <Text style={t.help}>
                This app does not load your balance, invoices, or payment
                details. Nothing here charges a card or changes your plan.
              </Text>
            </Card>
            <View style={s.cardHeader}>
              <Text style={t.h2}>Public plans</Text>
              <Text style={t.small}>
                From textmunication.com/pricing · checked {PLANS_CHECKED_ON}
              </Text>
            </View>
            <Card style={s.cardTight}>
              {PUBLIC_PLANS.map((plan, index) => (
                <View
                  key={plan.name}
                  style={[s.plan, index > 0 && s.planDivider]}
                  accessible
                  accessibilityLabel={`${plan.name}, $${plan.monthlyPrice} per month, ${plan.messages.toLocaleString("en-US")} messages`}
                >
                  <View style={ui.grow}>
                    <View style={s.planTitle}>
                      <Text style={t.h3}>{plan.name}</Text>
                      {plan.popular ? <Badge label="Most popular" tone="pink" /> : null}
                    </View>
                    <Text style={t.small}>{plan.tagline}</Text>
                    <Text style={t.small}>
                      {plan.messages.toLocaleString("en-US")} messages
                      {plan.overage !== "—" ? ` · overage ${plan.overage}` : ""}
                    </Text>
                  </View>
                  <View style={s.planPrice}>
                    <Text style={s.planAmount}>${plan.monthlyPrice}</Text>
                    <Text style={t.small}>/month</Text>
                  </View>
                </View>
              ))}
            </Card>
            <Card style={ui.stack}>
              <Text style={t.h3}>Every plan includes</Text>
              {PLAN_FEATURES.map((feature) => (
                <View key={feature} style={s.feature}>
                  <Icon name="check" size={16} color={C.green} />
                  <Text style={t.body}>{feature}</Text>
                </View>
              ))}
              <Button
                title="View pricing on textmunication.com"
                icon="external-link"
                variant="outline"
                onPress={() => open(LINKS.pricing)}
              />
            </Card>
          </>
        )}
      </ScrollView>

      <View style={s.navigation}>
        {navigation.map((item) => {
          const active =
            tab === item.id || (tab === "billing" && item.id === "settings");
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) tapFeedback();
                router.replace(item.route);
              }}
              style={({ pressed }) => [s.navItem, pressed && s.pressed]}
            >
              <View style={[s.navIcon, active && s.activeIcon]}>
                <Icon
                  name={item.icon}
                  size={20}
                  color={active ? C.primary : C.muted}
                />
              </View>
              <Text style={[s.navText, active && s.activeText]}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Sheet
        visible={!!composer}
        title={composer?.initial ? "Edit Campaign" : "Create New Campaign"}
        onClose={closeComposer}
        scrollKey="composer"
      >
        {composer && (
          <CampaignComposer
            key={composer.initial?.id || "new"}
            initial={composer.initial}
            seed={composer.seed}
            startWithWriter={composer.writer}
            onMarkSentRequest={
              composer.initial && composer.initial.status !== "sent"
                ? () => requestMarkSent(composer.initial!)
                : undefined
            }
            businessName={business.name}
            onDirtyChange={setDirty}
            onDeleteRequest={composer.initial ? () => requestDelete(composer.initial!) : undefined}
            onSaved={(message) => {
              setComposer(null);
              setDirty(false);
              announce(message);
            }}
          />
        )}
      </Sheet>

      <IdeasSheet
        visible={ideasOpen}
        industry={business.industry}
        businessName={business.name}
        subscriberCount={subscribed.length}
        onClose={() => setIdeasOpen(false)}
        onCreate={(seed) => {
          setIdeasOpen(false);
          openComposer(undefined, false, seed);
        }}
      />

      <CampaignResultsSheet
        campaign={resultsCampaign}
        onClose={() => setResultsId(null)}
        onSave={async (input) => {
          if (!resultsCampaign) return;
          await update(recordCampaignResults(data, resultsCampaign.id, input));
          setResultsId(null);
          announce(`Results saved for “${resultsCampaign.name}”.`);
        }}
        onUseAgain={() => {
          if (!resultsCampaign) return;
          const seed = campaignToSeed(resultsCampaign);
          setResultsId(null);
          openComposer(undefined, false, seed);
        }}
        onOpenReports={() => open(LINKS.samCampaigns)}
      />

      <Sheet
        visible={!!confirm}
        title={confirm?.title ?? ""}
        onClose={() => setConfirm(null)}
      >
        {confirm && (
          <View style={ui.stack}>
            <Text style={t.body}>{confirm.body}</Text>
            <Button
              title={confirm.action}
              icon={confirm.icon}
              variant={confirm.danger ? "danger" : "primary"}
              onPress={async () => {
                const action = confirm.onConfirm;
                setConfirm(null);
                await action();
              }}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setConfirm(null)}
            />
          </View>
        )}
      </Sheet>

      <Sheet
        visible={editingBusiness}
        title="Business Information"
        subtitle="Appears on your dashboard and in message examples"
        onClose={() => setEditingBusiness(false)}
      >
        {editingBusiness && (
          <BusinessForm
            initialName={business.name}
            initialIndustry={business.industry}
            onSave={(name, industry) => {
              updateBusiness({ name, industry });
              setEditingBusiness(false);
              setNotice("Business information updated.");
            }}
          />
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function CampaignsScreen({
  campaigns,
  counts,
  loggedRevenue,
  onCreate,
  onIdeas,
  onOpen,
}: {
  campaigns: Campaign[];
  counts: { drafts: number; scheduled: number; sent: number };
  loggedRevenue: number;
  onCreate: () => void;
  onIdeas: () => void;
  onOpen: (campaign: Campaign) => void;
}) {
  const { data } = useWorkspace();
  const groups = getGroups(data);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const listed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return campaigns
      .filter((c) => status === "All" || statusLabel(c) === status)
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          c.body.toLowerCase().includes(needle),
      )
      .sort((a, b) => Date.parse(b.createdAt ?? "0") - Date.parse(a.createdAt ?? "0"));
  }, [campaigns, query, status]);

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Manage and track your SMS, MMS, and RCS campaigns"
      >
        <Button
          title="Send Campaign"
          icon="send"
          variant="outlinePrimary"
          compact
          onPress={onCreate}
        />
        <Button title="Ideas" icon="trending-up" variant="outline" compact onPress={onIdeas} />
      </PageHeader>
      <View style={s.statRow}>
        <StatCard label="Drafts" value={counts.drafts} caption="Ready to finish" style={ui.grow} />
        <StatCard label="Scheduled" value={counts.scheduled} caption="Saved on device" style={ui.grow} />
        <StatCard
          label="Sent"
          value={counts.sent}
          caption={counts.sent > 0 ? `${formatMoney(loggedRevenue)} logged` : "Marked sent in SAM"}
          style={ui.grow}
        />
      </View>
      <Search value={query} onChange={setQuery} placeholder="Search campaigns…" />
      <Chips
        options={[...STATUS_FILTERS]}
        value={status}
        onChange={(value) => setStatus(value as (typeof STATUS_FILTERS)[number])}
        counts={{
          All: campaigns.length,
          Draft: counts.drafts,
          Scheduled: counts.scheduled,
          Sent: counts.sent,
        }}
      />
      <Card style={s.cardTight}>
        {listed.length === 0 ? (
          <Empty
            icon="message-square"
            title={
              campaigns.length === 0
                ? "No campaigns yet"
                : "No campaigns found matching your criteria."
            }
            body={
              campaigns.length === 0
                ? "Create your first campaign. SAM AI Assist can help with the wording, and you can save a draft before adding subscribers."
                : "Try another search or status filter."
            }
            action={campaigns.length === 0 ? "Create campaign" : undefined}
            actionIcon="plus"
            onAction={onCreate}
          />
        ) : (
          listed.map((campaign, index) => {
            const recipients = getAudienceContacts(
              data.contacts,
              campaign.audience,
              groups,
            ).length;
            return (
              <Row
                key={campaign.id}
                first={index === 0}
                title={campaign.name}
                subtitle={`${campaign.audience} · ${recipients} ${recipients === 1 ? "recipient" : "recipients"}${
                  campaign.status === "scheduled" && campaign.scheduledAt
                    ? ` · ${formatDate(campaign.scheduledAt, true)}`
                    : campaign.createdAt
                      ? ` · ${formatDate(campaign.createdAt)}`
                      : ""
                }`}
                leading={
                  <View style={s.rowIcon}>
                    <Icon
                      name={
                        isPastDue(campaign)
                          ? "alert-circle"
                          : campaign.status === "sent"
                            ? "send"
                            : campaign.status === "scheduled"
                              ? "clock"
                              : "edit-3"
                      }
                      size={17}
                      color={isPastDue(campaign) ? C.amber : C.primary}
                    />
                  </View>
                }
                trailing={
                  <View style={s.badges}>
                    <Badge label={campaign.type ?? "SMS"} tone="gray" />
                    <Badge
                      label={isPastDue(campaign) ? "Past due" : statusLabel(campaign)}
                      tone={
                        isPastDue(campaign)
                          ? "red"
                          : campaign.status === "sent"
                            ? "green"
                            : campaign.status === "scheduled"
                              ? "blue"
                              : "amber"
                      }
                    />
                  </View>
                }
                onPress={() => onOpen(campaign)}
                accessibilityLabel={`Open ${campaign.name}`}
              />
            );
          })
        )}
      </Card>
      <Text style={[t.small, s.centerText]}>
        Delivery reports and sent history sync from SAM when the app is connected.
      </Text>
    </>
  );
}

function BusinessForm({
  initialName,
  initialIndustry,
  onSave,
}: {
  initialName: string;
  initialIndustry: string;
  onSave: (name: string, industry: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry);
  const [error, setError] = useState("");
  const options = INDUSTRIES.includes(industry)
    ? INDUSTRIES
    : [...INDUSTRIES, industry];
  return (
    <View style={ui.stack}>
      <Input
        label="Business Name"
        required
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError("");
        }}
        autoCapitalize="words"
        maxLength={80}
        error={error}
      />
      <View style={{ gap: 8 }}>
        <Text style={t.label}>Industry</Text>
        <Chips options={options} value={industry} onChange={setIndustry} />
      </View>
      <Button
        title="Save changes"
        icon="check"
        onPress={() => {
          if (!name.trim()) {
            setError("Add your business name.");
            return;
          }
          onSave(name, industry);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingLeft: 18,
    paddingRight: 12,
    minHeight: 60,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  headerBusiness: {
    color: C.text,
    fontFamily: F.medium,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 18,
    paddingBottom: 28,
    gap: 16,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridWide: {},
  gridItem: { flexBasis: "47%", flexGrow: 1 },
  statRow: { flexDirection: "row", gap: 10 },
  cardTight: { padding: 0, overflow: "hidden" },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 2,
  },
  cardSection: {
    color: C.faint,
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: { alignItems: "flex-end", gap: 4 },
  ideas: { gap: 12 },
  ideasTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  assist: { alignItems: "center", gap: 10, paddingVertical: 22 },
  assistIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  assistTitle: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  centerText: { textAlign: "center" },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  connection: { gap: 8, backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  connectionTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    alignSelf: "flex-start",
    marginBottom: -6,
  },
  backText: { color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planDivider: { borderTopWidth: 1, borderTopColor: C.border },
  planTitle: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planPrice: { alignItems: "flex-end" },
  planAmount: { color: C.ink, fontFamily: F.bold, fontSize: 20, lineHeight: 26 },
  feature: { flexDirection: "row", alignItems: "center", gap: 10 },
  navigation: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  navItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    gap: 3,
  },
  navIcon: {
    width: 46,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: R.pill,
  },
  activeIcon: { backgroundColor: C.primarySoft },
  navText: { color: C.muted, fontFamily: F.medium, fontSize: 10, lineHeight: 14 },
  activeText: { color: C.primary, fontFamily: F.semibold },
  pressed: { opacity: 0.7 },
});

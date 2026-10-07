import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAccess } from "./access";
import { CampaignComposer } from "./campaign-composer";
import { Campaign } from "./domain";
import { useDemo } from "./store";
import {
  Badge,
  Brand,
  Button,
  C,
  Card,
  Empty,
  Icon,
  IconName,
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
const navigation: {
  id: Tab;
  title: string;
  icon: IconName;
  route: "/" | "/campaigns" | "/inbox" | "/contacts" | "/billing";
}[] = [
  { id: "overview", title: "Home", icon: "home", route: "/" },
  { id: "campaigns", title: "Campaigns", icon: "send", route: "/campaigns" },
  { id: "inbox", title: "Inbox", icon: "message-circle", route: "/inbox" },
  { id: "contacts", title: "Audience", icon: "users", route: "/contacts" },
  { id: "billing", title: "Billing", icon: "credit-card", route: "/billing" },
];

function NextAction({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.nextAction, pressed && s.pressed]}
    >
      <View style={s.actionIcon}>
        <Icon name={icon} color={C.primary} />
      </View>
      <View style={ui.grow}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.small}>{detail}</Text>
      </View>
      <Icon name="chevron-right" size={18} />
    </Pressable>
  );
}

export function Workspace({ tab }: { tab: Tab }) {
  const { businessName, leaveDemo } = useAccess();
  const { data, storageError } = useDemo();
  const [composer, setComposer] = useState<{ initial?: Campaign } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState("");
  const [linkError, setLinkError] = useState("");
  const drafts = data.campaigns.filter(
    (campaign) => campaign.status === "draft",
  );
  const subscriberCount = data.contacts.filter(
    (contact) => contact.consent === "subscribed",
  ).length;

  function create(initial?: Campaign) {
    setDirty(false);
    setDiscard(false);
    setNotice("");
    setComposer({ initial });
  }
  function closeComposer() {
    if (discard) setDiscard(false);
    else if (dirty) setDiscard(true);
    else setComposer(null);
  }
  function openSam(account = false) {
    setLinkError("");
    Linking.openURL(
      account
        ? "https://sam3.txhd.io/account-settings"
        : "https://sam3.txhd.io/",
    ).catch(() =>
      setLinkError(
        "SAM could not open. Please try again, or visit sam3.txhd.io.",
      ),
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Brand compact />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account settings"
          onPress={() => router.replace("/settings")}
          style={({ pressed }) => [s.settings, pressed && s.pressed]}
        >
          <Icon name="settings" color={C.ink} />
        </Pressable>
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
          <Text accessibilityLiveRegion="polite" style={s.notice}>
            {notice}
          </Text>
        )}
        {tab === "overview" && (
          <>
            <View style={s.intro}>
              <Text style={s.eyebrow}>{businessName || "YOUR BUSINESS"}</Text>
              <Text accessibilityRole="header" style={s.title}>
                Welcome to SAM.
              </Text>
              <Text style={ui.help}>
                Your next customer connection starts here.
              </Text>
            </View>
            <View style={s.metrics}>
              <Card style={s.metric}>
                <Text style={s.number}>{subscriberCount}</Text>
                <Text style={s.small}>Subscribers</Text>
              </Card>
              <Card style={s.metric}>
                <Text style={s.number}>{drafts.length}</Text>
                <Text style={s.small}>Campaign drafts</Text>
              </Card>
            </View>
            <View style={ui.stack}>
              <Text accessibilityRole="header" style={ui.h2}>
                Let’s get started
              </Text>
              <Card style={s.actionCard}>
                <NextAction
                  title="Add subscribers"
                  detail="Grow your customer community"
                  icon="user-plus"
                  onPress={() => router.replace("/contacts")}
                />
                <View style={s.divider} />
                <NextAction
                  title="Create a campaign"
                  detail="Start with an offer or a friendly hello"
                  icon="send"
                  onPress={() => create()}
                />
                <View style={s.divider} />
                <NextAction
                  title="Check your inbox"
                  detail="Keep every conversation together"
                  icon="message-circle"
                  onPress={() => router.replace("/inbox")}
                />
              </Card>
            </View>
            <Card style={s.tip}>
              <Icon name="heart" color={C.primary} size={20} />
              <Text style={[ui.help, ui.grow]}>
                Start small. One useful message can give customers a reason to
                come back.
              </Text>
            </Card>
          </>
        )}
        {tab === "campaigns" && (
          <>
            <View style={s.intro}>
              <Text accessibilityRole="header" style={s.title}>
                Campaigns
              </Text>
              <Text style={ui.help}>
                A good message starts with a simple idea.
              </Text>
            </View>
            <Button title="New campaign" icon="plus" onPress={() => create()} />
            {data.campaigns.length === 0 ? (
              <Card>
                <Empty
                  icon="send"
                  title="Your first campaign starts here"
                  body="Share an offer, announce something new, or welcome customers back. We’ll help with the words."
                />
              </Card>
            ) : (
              data.campaigns.map((campaign) => (
                <Pressable
                  key={campaign.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${campaign.name}`}
                  onPress={() =>
                    campaign.status === "draft" ? create(campaign) : openSam()
                  }
                  style={({ pressed }) => [s.campaign, pressed && s.pressed]}
                >
                  <View style={ui.between}>
                    <Text style={[s.actionTitle, ui.grow]}>
                      {campaign.name}
                    </Text>
                    <Badge
                      label={
                        campaign.status === "draft"
                          ? "Draft"
                          : campaign.status === "sent"
                            ? "Sent"
                            : "Scheduled"
                      }
                      tone="gray"
                    />
                  </View>
                  <Text style={ui.help} numberOfLines={2}>
                    {campaign.body}
                  </Text>
                  <Text style={s.small}>{campaign.audience}</Text>
                </Pressable>
              ))
            )}
          </>
        )}
        {tab === "inbox" && (
          <>
            <View style={s.intro}>
              <Text accessibilityRole="header" style={s.title}>
                Inbox
              </Text>
              <Text style={ui.help}>
                A simple space for customer conversations.
              </Text>
            </View>
            <Card>
              <Empty
                icon="message-circle"
                title="No conversations yet"
                body="Customer replies will appear here once messaging is connected."
              />
            </Card>
            <Button
              title="Open SAM"
              variant="secondary"
              icon="external-link"
              onPress={() => openSam()}
            />
          </>
        )}
        {tab === "contacts" && (
          <>
            <View style={s.intro}>
              <Text accessibilityRole="header" style={s.title}>
                Your audience
              </Text>
              <Text style={ui.help}>
                Make it easy for customers to hear from you.
              </Text>
            </View>
            <Card>
              <Empty
                icon="users"
                title="Your community starts here"
                body="Invite customers to sign up for your texts. Only add people who have agreed to receive messages."
              />
            </Card>
            <Button
              title="Add subscribers in SAM"
              icon="user-plus"
              onPress={() => openSam()}
            />
            <Text style={s.centerHelp}>
              Opens your SAM account to manage subscribers.
            </Text>
            <Card style={ui.stack}>
              <Text style={ui.h2}>Give customers a simple way to join</Text>
              <Text style={ui.help}>
                A signup QR code by the register is a great place to start. Set
                up your texting number and keyword in SAM, then share your sign.
              </Text>
            </Card>
          </>
        )}
        {tab === "billing" && (
          <>
            <View style={s.intro}>
              <Text accessibilityRole="header" style={s.title}>
                Your billing
              </Text>
              <Text style={ui.help}>Your plan and payments, in one place.</Text>
            </View>
            <Card style={ui.stack}>
              <View style={s.actionIcon}>
                <Icon name="credit-card" color={C.primary} />
              </View>
              <Text style={ui.h2}>Manage your account</Text>
              <Text style={ui.help}>
                Open your SAM account settings to manage your business details.
              </Text>
              <Button
                title="Manage account"
                icon="external-link"
                onPress={() => openSam(true)}
              />
              <Text style={s.small}>Opens SAM account settings.</Text>
            </Card>
            <Card>
              <Empty
                icon="file-text"
                title="Invoices"
                body="Your invoices will appear here when billing is connected."
              />
            </Card>
          </>
        )}
        {tab === "settings" && (
          <>
            <View style={s.intro}>
              <Text accessibilityRole="header" style={s.title}>
                Account settings
              </Text>
              <Text style={ui.help}>The details behind your business.</Text>
            </View>
            <Card style={ui.stack}>
              <Text style={s.small}>Business name</Text>
              <Text style={ui.h2}>{businessName || "Your business"}</Text>
              <Button
                title="Manage account in SAM"
                variant="secondary"
                icon="external-link"
                onPress={() => openSam(true)}
              />
            </Card>
            <Button
              title="Sign out"
              variant="secondary"
              icon="log-out"
              onPress={leaveDemo}
            />
          </>
        )}
      </ScrollView>
      <View style={s.navigation}>
        {navigation.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => router.replace(item.route)}
            style={({ pressed }) => [s.navItem, pressed && s.pressed]}
          >
            <View style={[s.navIcon, tab === item.id && s.activeIcon]}>
              <Icon
                name={item.icon}
                size={21}
                color={tab === item.id ? C.primary : C.muted}
              />
            </View>
            <Text style={[s.navText, tab === item.id && s.activeText]}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <Sheet
        visible={!!composer}
        title={
          discard
            ? "Keep your changes?"
            : composer?.initial
              ? "Edit campaign"
              : "Create a campaign"
        }
        onClose={closeComposer}
        scrollKey={discard ? "discard" : "composer"}
      >
        {discard && (
          <View style={ui.stack}>
            <Text style={ui.body}>
              Your changes haven’t been saved. Keep editing to finish your
              draft, or discard these changes.
            </Text>
            <Button title="Keep editing" onPress={() => setDiscard(false)} />
            <Button
              title="Discard changes"
              variant="secondary"
              onPress={() => {
                setComposer(null);
                setDiscard(false);
                setDirty(false);
              }}
            />
          </View>
        )}
        {composer && (
          <View style={discard ? { display: "none" } : undefined}>
            <CampaignComposer
              customerMode
              key={composer.initial?.id || "new"}
              initial={composer.initial}
              onDirtyChange={setDirty}
              onSaved={() => {
                setComposer(null);
                setDirty(false);
                setDiscard(false);
                setNotice("Draft saved for this session.");
              }}
            />
          </View>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingLeft: 22,
    paddingRight: 14,
    minHeight: 76,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settings: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 22,
    paddingBottom: 28,
    gap: 22,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  intro: { gap: 9, paddingTop: 5 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: C.primary,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.8,
    fontWeight: "700",
    color: C.ink,
  },
  metrics: { flexDirection: "row", gap: 12 },
  metric: { flex: 1, minWidth: 0, gap: 5, padding: 18 },
  number: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: C.ink },
  small: { fontSize: 12, lineHeight: 18, color: C.muted },
  actionCard: { padding: 0, overflow: "hidden" },
  nextAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 96,
    padding: 16,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    color: C.ink,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
  },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  tip: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: C.lilac,
    borderColor: C.lilac,
    padding: 16,
  },
  campaign: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 18,
    gap: 10,
  },
  centerHelp: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -12,
  },
  notice: {
    color: C.green,
    backgroundColor: "#E7F5EE",
    padding: 12,
    borderRadius: 9,
    fontSize: 14,
    lineHeight: 21,
  },
  navigation: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    gap: 4,
  },
  navIcon: {
    width: 42,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeIcon: { backgroundColor: C.lilac },
  navText: { color: C.muted, fontSize: 10, lineHeight: 15, fontWeight: "500" },
  activeText: { color: C.primary, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ALL_SUBSCRIBERS,
  Contact,
  addContact,
  addGroup,
  getGroups,
  removeContact,
  updateContact,
} from "./domain";
import { LINKS, openLink } from "./links";
import { useWorkspace } from "./store";
import {
  Avatar,
  Badge,
  Button,
  C,
  Card,
  Checkbox,
  Chips,
  Empty,
  F,
  Icon,
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

type View_ = "all" | "opted-out" | { group: string };
type SheetState =
  | null
  | { kind: "add"; group?: string }
  | { kind: "group" }
  | { kind: "detail"; id: string }
  | { kind: "remove"; id: string };

function formatPhone(phone: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return match ? `+1 (${match[1]}) ${match[2]}-${match[3]}` : phone;
}

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** The Subscribers area, following the SAM 3.0 Subscribers → Groups page. */
export function SubscribersScreen({
  businessName,
  onNotice,
}: {
  businessName: string;
  onNotice: (message: string) => void;
}) {
  const { data, ready, update } = useWorkspace();
  const groups = getGroups(data);
  const [view, setView] = useState<View_>("all");
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [linkError, setLinkError] = useState("");

  const subscribed = data.contacts.filter((c) => c.consent === "subscribed");
  const optedOut = data.contacts.filter((c) => c.consent === "unsubscribed");
  const now = new Date();
  const optInsThisMonth = subscribed.filter((contact) => {
    if (!contact.createdAt) return false;
    const created = new Date(contact.createdAt);
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    );
  }).length;

  const listTitle =
    view === "all"
      ? ALL_SUBSCRIBERS
      : view === "opted-out"
        ? "Opted Out Subscribers"
        : view.group;
  const listed = useMemo(() => {
    const base =
      view === "all"
        ? subscribed
        : view === "opted-out"
          ? optedOut
          : data.contacts.filter(
              (c) => c.group === view.group && c.consent === "subscribed",
            );
    const needle = query.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return base
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          (digits.length > 0 && c.phone.includes(digits)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [view, query, subscribed, optedOut, data.contacts]);

  const detail =
    sheet?.kind === "detail" || sheet?.kind === "remove"
      ? data.contacts.find((c) => c.id === sheet.id)
      : undefined;

  async function open(url: string) {
    setLinkError(await openLink(url));
  }

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="Manage your subscriber groups and individual subscriber data"
      >
        <Button
          title="Create Group"
          icon="folder-plus"
          variant="outline"
          compact
          onPress={() => setSheet({ kind: "group" })}
        />
        <Button
          title="Add Subscriber"
          icon="user-plus"
          compact
          onPress={() =>
            setSheet({
              kind: "add",
              group: typeof view === "object" ? view.group : undefined,
            })
          }
        />
      </PageHeader>
      {!!linkError && (
        <Text accessibilityRole="alert" style={ui.error}>
          {linkError}
        </Text>
      )}

      <View style={s.statRow}>
        <StatCard
          label="Total Unique Subscribers"
          value={subscribed.length}
          caption="Unique subscribers"
          style={ui.grow}
        />
        <StatCard
          label="Total groups created"
          value={groups.length}
          caption="Manual groups"
          style={ui.grow}
        />
      </View>
      <View style={s.statRow}>
        <StatCard
          label="Monthly Opt-ins"
          value={optInsThisMonth}
          caption="New subscribers this month"
          style={ui.grow}
        />
        <StatCard
          label="Opted Out"
          value={optedOut.length}
          caption="Excluded from campaigns"
          style={ui.grow}
        />
      </View>

      <Card style={s.groupsCard}>
        <View style={s.groupsHeader}>
          <Text style={t.h3}>Groups</Text>
          <Text style={t.small}>Tap a group to view subscribers</Text>
        </View>
        <GroupRow
          title={ALL_SUBSCRIBERS}
          count={subscribed.length}
          selected={view === "all"}
          onPress={() => setView("all")}
          first
        />
        <Text style={s.groupSection}>MANUAL GROUPS ({groups.length})</Text>
        {groups.map((group) => (
          <GroupRow
            key={group}
            title={group}
            count={
              data.contacts.filter(
                (c) => c.group === group && c.consent === "subscribed",
              ).length
            }
            selected={typeof view === "object" && view.group === group}
            onPress={() => setView({ group })}
          />
        ))}
        <Text style={s.groupSection}>OPTED OUT</Text>
        <GroupRow
          title="Opted Out Subscribers"
          count={optedOut.length}
          selected={view === "opted-out"}
          onPress={() => setView("opted-out")}
          tone="gray"
        />
      </Card>

      <View style={s.listHeading}>
        <Text accessibilityRole="header" style={t.h2}>
          {listTitle}
        </Text>
        <Text style={t.help}>
          {listed.length} {listed.length === 1 ? "subscriber" : "subscribers"}
        </Text>
      </View>
      <Search
        value={query}
        onChange={setQuery}
        placeholder="Search by name or number"
      />
      <Card style={s.listCard}>
        {listed.length === 0 ? (
          <Empty
            icon="users"
            title={
              query
                ? "No subscribers match your search"
                : view === "opted-out"
                  ? "No opted-out subscribers"
                  : "No subscribers yet"
            }
            body={
              query
                ? "Try a different name or mobile number."
                : view === "opted-out"
                  ? "People who ask to stop receiving texts appear here and are excluded from every campaign."
                  : "Add people who agreed to receive texts from you. Keyword opt-ins and web forms sync when your SAM account is connected."
            }
            action={view === "opted-out" || query ? undefined : "Add Subscriber"}
            actionIcon="user-plus"
            onAction={() =>
              setSheet({
                kind: "add",
                group: typeof view === "object" ? view.group : undefined,
              })
            }
          />
        ) : (
          listed.map((contact, index) => (
            <Row
              key={contact.id}
              first={index === 0}
              title={contact.name}
              subtitle={`${formatPhone(contact.phone)} · ${contact.group}`}
              leading={
                <Avatar
                  name={contact.name}
                  size={38}
                  tone={contact.consent === "subscribed" ? "blue" : "gray"}
                />
              }
              trailing={
                contact.consent === "unsubscribed" ? (
                  <Badge label="Opted out" tone="gray" />
                ) : undefined
              }
              onPress={() => setSheet({ kind: "detail", id: contact.id })}
              accessibilityLabel={`Open ${contact.name}`}
            />
          ))
        )}
      </Card>

      <Card style={s.syncCard}>
        <View style={s.syncIcon}>
          <Icon name="smartphone" color={C.primary} size={20} />
        </View>
        <View style={ui.grow}>
          <Text style={t.h3}>Keywords, web forms, and imports</Text>
          <Text style={t.help}>
            Text-to-join keywords, signup forms, and bulk imports are managed in
            SAM on the web. Subscribers added here are saved on this device.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open subscribers in SAM"
            onPress={() => open(LINKS.samSubscribers)}
            style={({ pressed }) => [s.linkRow, pressed && s.pressed]}
          >
            <Text style={t.link}>Open Subscribers in SAM</Text>
            <Icon name="external-link" size={15} color={C.primary} />
          </Pressable>
        </View>
      </Card>

      <AddSubscriberSheet
        visible={sheet?.kind === "add"}
        groups={groups}
        initialGroup={sheet?.kind === "add" ? sheet.group : undefined}
        businessName={businessName}
        onClose={() => setSheet(null)}
        onSave={async (input) => {
          const next = addContact(data, input);
          if (!ready) throw new Error("Please wait a moment and try again.");
          await update(next);
          setSheet(null);
          onNotice(`${input.name.trim()} was added to ${input.group}.`);
        }}
      />

      <CreateGroupSheet
        visible={sheet?.kind === "group"}
        onClose={() => setSheet(null)}
        onSave={async (name) => {
          const next = addGroup(data, name);
          if (!ready) throw new Error("Please wait a moment and try again.");
          await update(next);
          setSheet(null);
          setView({ group: getGroups(next)[getGroups(next).length - 1] });
          onNotice(`Group “${name.trim()}” was created.`);
        }}
      />

      <SubscriberDetailSheet
        visible={sheet?.kind === "detail" && !!detail}
        contact={detail}
        groups={groups}
        onClose={() => setSheet(null)}
        onSave={async (patch) => {
          if (!detail) return;
          await update(updateContact(data, detail.id, patch));
          setSheet(null);
          onNotice(
            patch.consent === "unsubscribed"
              ? `${detail.name} was marked as opted out.`
              : patch.consent === "subscribed"
                ? `${detail.name} was resubscribed.`
                : `${detail.name} was updated.`,
          );
        }}
        onRemove={() => detail && setSheet({ kind: "remove", id: detail.id })}
      />

      <Sheet
        visible={sheet?.kind === "remove" && !!detail}
        title="Remove subscriber?"
        onClose={() => detail && setSheet({ kind: "detail", id: detail.id })}
      >
        <Text style={t.body}>
          {detail?.name} will be removed from this device. This does not change
          your SAM account on the web.
        </Text>
        <Button
          title="Remove"
          icon="trash-2"
          variant="danger"
          onPress={async () => {
            if (!detail) return;
            await update(removeContact(data, detail.id));
            setSheet(null);
            onNotice(`${detail.name} was removed.`);
          }}
        />
        <Button
          title="Keep subscriber"
          variant="outline"
          onPress={() => detail && setSheet({ kind: "detail", id: detail.id })}
        />
      </Sheet>
    </>
  );
}

function GroupRow({
  title,
  count,
  selected,
  onPress,
  first = false,
  tone = "blue",
}: {
  title: string;
  count: number;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
  tone?: "blue" | "gray";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.groupRow,
        !first && s.groupDivider,
        selected && s.groupSelected,
        pressed && s.pressed,
      ]}
    >
      <Icon
        name={tone === "gray" ? "user-x" : "users"}
        size={17}
        color={selected ? C.primary : C.faint}
      />
      <Text
        style={[s.groupTitle, selected && s.groupTitleSelected, ui.grow]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text style={[s.groupCount, selected && s.groupTitleSelected]}>
        {count}
      </Text>
    </Pressable>
  );
}

function AddSubscriberSheet({
  visible,
  groups,
  initialGroup,
  businessName,
  onClose,
  onSave,
}: {
  visible: boolean;
  groups: string[];
  initialGroup?: string;
  businessName: string;
  onClose: () => void;
  onSave: (input: {
    name: string;
    phone: string;
    group: string;
    consentConfirmed: boolean;
  }) => Promise<void>;
}) {
  return (
    <Sheet
      visible={visible}
      title="Add Subscriber"
      subtitle="Saved on this device"
      onClose={onClose}
      scrollKey={visible ? "open" : "closed"}
    >
      {visible ? (
        <AddSubscriberForm
          groups={groups}
          initialGroup={initialGroup}
          businessName={businessName}
          onSave={onSave}
        />
      ) : null}
    </Sheet>
  );
}

function AddSubscriberForm({
  groups,
  initialGroup,
  businessName,
  onSave,
}: {
  groups: string[];
  initialGroup?: string;
  businessName: string;
  onSave: (input: {
    name: string;
    phone: string;
    group: string;
    consentConfirmed: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState(initialGroup ?? groups[0] ?? "");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({ name, phone, group, consentConfirmed: consent });
    } catch (caught) {
      setError(describeError(caught, "The subscriber could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={ui.stack}>
      <Input
        label="Name"
        required
        placeholder="First and last name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError("");
        }}
        autoCapitalize="words"
        maxLength={80}
      />
      <Input
        label="Mobile Number"
        required
        placeholder="(925) 555-0182"
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          setError("");
        }}
        inputMode="tel"
        maxLength={24}
        help="US and Canada numbers can skip the +1. Other countries include the country code."
      />
      <View style={s.field}>
        <Text style={t.label}>Group</Text>
        <Chips options={groups} value={group} onChange={setGroup} />
      </View>
      <Checkbox
        checked={consent}
        label={`This person agreed to receive text messages from ${businessName}.`}
        onToggle={() => {
          setConsent(!consent);
          setError("");
        }}
      />
      <Text style={t.small}>
        Only message people who opted in. Opt-outs are honored automatically
        and excluded from every campaign.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      <Button
        title={saving ? "Saving…" : "Add Subscriber"}
        icon="user-plus"
        disabled={saving}
        onPress={save}
      />
    </View>
  );
}

function CreateGroupSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  return (
    <Sheet
      visible={visible}
      title="Create Group"
      subtitle="A manual group you can target with campaigns"
      onClose={onClose}
      scrollKey={visible ? "open" : "closed"}
    >
      {visible ? <CreateGroupForm onSave={onSave} /> : null}
    </Sheet>
  );
}

function CreateGroupForm({ onSave }: { onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <View style={ui.stack}>
      <Input
        label="Group Name"
        required
        placeholder="e.g. Weekend regulars"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError("");
        }}
        autoCapitalize="sentences"
        maxLength={40}
        onSubmitEditing={() =>
          onSave(name).catch((caught) =>
            setError(describeError(caught, "The group could not be created.")),
          )
        }
        returnKeyType="done"
      />
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      <Button
        title="Create Group"
        icon="folder-plus"
        onPress={() =>
          onSave(name).catch((caught) =>
            setError(describeError(caught, "The group could not be created.")),
          )
        }
      />
    </View>
  );
}

function SubscriberDetailSheet({
  visible,
  contact,
  groups,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean;
  contact?: Contact;
  groups: string[];
  onClose: () => void;
  onSave: (
    patch: Partial<Pick<Contact, "name" | "group" | "consent">>,
  ) => Promise<void>;
  onRemove: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      title={contact?.name ?? "Subscriber"}
      subtitle={contact ? formatPhone(contact.phone) : undefined}
      onClose={onClose}
      scrollKey={contact?.id}
    >
      {visible && contact ? (
        <SubscriberDetail
          key={contact.id}
          contact={contact}
          groups={groups}
          onSave={onSave}
          onRemove={onRemove}
        />
      ) : null}
    </Sheet>
  );
}

function SubscriberDetail({
  contact,
  groups,
  onSave,
  onRemove,
}: {
  contact: Contact;
  groups: string[];
  onSave: (
    patch: Partial<Pick<Contact, "name" | "group" | "consent">>,
  ) => Promise<void>;
  onRemove: () => void;
}) {
  const [name, setName] = useState(contact.name);
  const [group, setGroup] = useState(contact.group);
  const [error, setError] = useState("");
  const changed = name !== contact.name || group !== contact.group;
  const subscribed = contact.consent === "subscribed";

  function run(patch: Partial<Pick<Contact, "name" | "group" | "consent">>) {
    onSave(patch).catch((caught) =>
      setError(describeError(caught, "The change could not be saved.")),
    );
  }

  return (
    <View style={ui.stack}>
      <View style={s.detailStatus}>
        <Badge
          label={subscribed ? "Subscribed" : "Opted out"}
          tone={subscribed ? "green" : "gray"}
        />
        {contact.createdAt ? (
          <Text style={t.small}>
            Added{" "}
            {new Date(contact.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        ) : null}
      </View>
      <Input
        label="Name"
        required
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError("");
        }}
        autoCapitalize="words"
        maxLength={80}
      />
      <View style={s.field}>
        <Text style={t.label}>Group</Text>
        <Chips options={groups} value={group} onChange={setGroup} />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      <Button
        title="Save changes"
        icon="check"
        disabled={!changed}
        onPress={() => run({ name, group })}
      />
      <View style={s.divider} />
      <Text style={t.help}>
        {subscribed
          ? "Marking someone as opted out removes them from every campaign audience."
          : "Only resubscribe someone who has asked to receive your texts again."}
      </Text>
      <Button
        title={subscribed ? "Mark as opted out" : "Resubscribe"}
        icon={subscribed ? "user-x" : "user-check"}
        variant={subscribed ? "outline" : "outlinePrimary"}
        onPress={() =>
          run({ consent: subscribed ? "unsubscribed" : "subscribed" })
        }
      />
      <Button
        title="Remove from this device"
        icon="trash-2"
        variant="danger"
        onPress={onRemove}
      />
    </View>
  );
}

const s = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 10 },
  groupsCard: { padding: 0, overflow: "hidden" },
  groupsHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 2,
  },
  groupSection: {
    color: C.faint,
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  groupDivider: { borderTopWidth: 1, borderTopColor: C.border },
  groupSelected: { backgroundColor: C.primarySoft },
  groupTitle: { color: C.ink, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  groupTitleSelected: { color: C.primaryDark, fontFamily: F.semibold },
  groupCount: { color: C.muted, fontFamily: F.semibold, fontSize: 13, lineHeight: 18 },
  listHeading: { gap: 2, paddingTop: 4 },
  listCard: { padding: 0, overflow: "hidden" },
  syncCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  syncIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    marginTop: 4,
  },
  field: { gap: 8 },
  detailStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  pressed: { opacity: 0.7 },
});

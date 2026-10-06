import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Campaign, getAudienceContacts, getSmsInfo } from "./domain";
import {
  CampaignGoal,
  CampaignSeed,
  WriterTone,
  campaignToSeed,
  campaignTitle,
  saveCampaign,
  suggestMessage,
  withOptOut,
} from "./sam";
import { useDemo } from "./store";
import { emptyOfferDraft } from "./offers";
import { OfferBuilder } from "./offer-builder";
import {
  Badge,
  Button,
  C,
  Card,
  Chips,
  Icon,
  Input,
  ui,
  useSheetScroll,
} from "./ui";

const STEPS = ["Message", "Audience", "Review"] as const;
const GOALS: { value: CampaignGoal; label: string; detail: string }[] = [
  {
    value: "promotion",
    label: "Share an offer",
    detail: "Give people a reason to visit",
  },
  {
    value: "reengage",
    label: "Reconnect",
    detail: "Welcome your customers back",
  },
  {
    value: "update",
    label: "Send an update",
    detail: "Keep your community in the loop",
  },
];
const TONES: { value: WriterTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "energetic", label: "Energetic" },
];
const AUDIENCES: { name: Campaign["audience"]; description: string }[] = [
  {
    name: "All subscribers",
    description: "Everyone who can receive your messages",
  },
  { name: "VIP", description: "Your most loyal customers" },
  { name: "Members", description: "People in your member community" },
  { name: "Leads", description: "People getting to know your business" },
];

type Timing = "draft" | "keep" | "tomorrow" | "later";
const EXPIRED_TIMING =
  "This preview time has passed. Choose a new time or save this as a draft.";

// The footer has its own visible home in the editor and is added once on save.
function editableMessage(value: string) {
  return value.replace(/(?:\s*Reply STOP to opt out\.?\s*)+$/i, "").trim();
}

function displayDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CampaignComposer({
  initial,
  seed,
  goal,
  onSaved,
  onDirtyChange,
}: {
  initial?: Campaign;
  seed?: CampaignSeed;
  goal?: CampaignGoal;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { data, ready, update, completeGuide } = useDemo();
  const resetSheetScroll = useSheetScroll();
  const startingValues = initial ?? seed;
  const [step, setStep] = useState(0);
  const [body, setBody] = useState(() =>
    editableMessage(startingValues?.body ?? ""),
  );
  const [name, setName] = useState(startingValues?.name ?? "");
  const [audience, setAudience] = useState<Campaign["audience"]>(
    startingValues?.audience ?? "All subscribers",
  );
  const [pastOpen, setPastOpen] = useState(false);
  const [reusing, setReusing] = useState(Boolean(seed));
  const pastCampaigns = data.campaigns
    .filter((campaign) => campaign.status === "sent")
    .slice(0, 5);
  const [writerOpen, setWriterOpen] = useState(Boolean(goal));
  const [writerGoal, setWriterGoal] = useState<CampaignGoal>(
    goal ?? "promotion",
  );
  const [tone, setTone] = useState<WriterTone>("friendly");
  const [details, setDetails] = useState("");
  const [offerDraft, setOfferDraft] = useState(emptyOfferDraft);
  const [timing, setTiming] = useState<Timing>(
    initial?.scheduledAt ? "keep" : "draft",
  );
  const [scheduledAt, setScheduledAt] = useState<string | undefined>(
    initial?.scheduledAt,
  );
  const [messageError, setMessageError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [audienceError, setAudienceError] = useState("");
  const [nameError, setNameError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [timingError, setTimingError] = useState(() =>
    initial?.scheduledAt && Date.parse(initial.scheduledAt) <= Date.now()
      ? EXPIRED_TIMING
      : "",
  );

  const dirty =
    reusing ||
    JSON.stringify(offerDraft) !== JSON.stringify(emptyOfferDraft()) ||
    body !== editableMessage(initial?.body ?? "") ||
    name !== (initial?.name ?? "") ||
    audience !== (initial?.audience ?? "All subscribers") ||
    scheduledAt !== initial?.scheduledAt ||
    details !== "" ||
    writerGoal !== (goal ?? "promotion") ||
    tone !== "friendly";
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const fullMessage = withOptOut(body);
  const sms = getSmsInfo(fullMessage);
  const recipients = getAudienceContacts(data.contacts, audience).length;
  const audienceTotal = data.contacts.filter(
    (contact) => audience === "All subscribers" || contact.group === audience,
  ).length;
  const excluded = audienceTotal - recipients;
  const timeZone = Intl.DateTimeFormat()
    .resolvedOptions()
    .timeZone.replace(/_/g, " ");

  const goToStep = (next: number) => {
    setStep(next);
    setSaveError("");
    resetSheetScroll();
  };

  const continueToAudience = () => {
    if (!/[\p{L}\p{N}]/u.test(editableMessage(body))) {
      setMessageError("Write a message for your customers before continuing.");
      return;
    }
    if (fullMessage.length > 1600) {
      setMessageError(
        "Shorten your message to 1,600 characters, including the opt-out line.",
      );
      return;
    }
    setMessageError("");
    goToStep(1);
  };

  const continueToReview = () => {
    if (!recipients) {
      setAudienceError(
        "This audience has no subscribed contacts. Choose another group.",
      );
      return;
    }
    setAudienceError("");
    if (!name.trim()) setName(campaignTitle(body));
    setTimingError(
      scheduledAt && Date.parse(scheduledAt) <= Date.now()
        ? EXPIRED_TIMING
        : "",
    );
    goToStep(2);
  };

  const createStartingPoint = () => {
    if (!details.trim()) {
      setDetailsError("Add the details you want your customers to know.");
      return;
    }
    try {
      const suggestion = suggestMessage({ goal: writerGoal, tone, details });
      setBody(editableMessage(suggestion));
      completeGuide("writer");
      setDetailsError("");
      setMessageError("");
    } catch (error) {
      setDetailsError(
        error instanceof Error
          ? error.message
          : "Check your details and try again.",
      );
    }
  };

  const chooseTiming = (choice: Timing) => {
    setTiming(choice);
    setSaveError("");
    setTimingError("");
    if (choice === "draft") {
      setScheduledAt(undefined);
      return;
    }
    if (choice === "keep") {
      setScheduledAt(initial?.scheduledAt);
      setTimingError(
        initial?.scheduledAt && Date.parse(initial.scheduledAt) <= Date.now()
          ? EXPIRED_TIMING
          : "",
      );
      return;
    }
    const date = new Date();
    if (choice === "tomorrow") {
      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);
    } else {
      date.setTime(date.getTime() + 2 * 60 * 60 * 1000);
    }
    setScheduledAt(date.toISOString());
  };

  const save = () => {
    if (!name.trim()) {
      setNameError("Give this campaign a name so you can find it later.");
      return;
    }
    if (scheduledAt && Date.parse(scheduledAt) <= Date.now()) {
      setTimingError(EXPIRED_TIMING);
      return;
    }
    if (!ready) return;
    try {
      update(
        saveCampaign(data, {
          ...(initial ? { id: initial.id } : {}),
          name,
          body: fullMessage,
          audience,
          scheduledAt,
        }),
      );
      onSaved();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Your draft could not be saved. Try again.",
      );
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={styles.progress}
        accessibilityLabel={`Step ${step + 1} of 3: ${STEPS[step]}`}
      >
        {STEPS.map((label, index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`${label}${index === step ? ", current step" : ""}`}
            accessibilityState={{
              disabled: index > step,
              selected: index === step,
            }}
            disabled={index > step}
            onPress={() => goToStep(index)}
            style={styles.progressItem}
          >
            <View
              style={[styles.stepCircle, index <= step && styles.stepActive]}
            >
              {index < step ? (
                <Icon name="check" size={16} color={C.white} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    index === step && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                index === step && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {step === 0 && (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text style={ui.h2}>Start a conversation.</Text>
            <Text style={[ui.body, ui.muted]}>
              One clear message. One easy next step for your customer.
            </Text>
          </View>

          {!initial &&
            !reusing &&
            !body.trim() &&
            !writerOpen &&
            pastCampaigns.length > 0 && (
              <View style={styles.reuseCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use a past message"
                  accessibilityState={{ expanded: pastOpen }}
                  onPress={() => setPastOpen(!pastOpen)}
                  style={styles.reuseToggle}
                >
                  <Icon name="rotate-ccw" color={C.primary} size={21} />
                  <View style={ui.grow}>
                    <Text style={styles.optionTitle}>Use a past message</Text>
                    <Text style={ui.help}>
                      Less typing. A fresh version of your own words.
                    </Text>
                  </View>
                  <Icon
                    name={pastOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={C.primary}
                  />
                </Pressable>
                {pastOpen && (
                  <View style={styles.reuseList}>
                    <Text style={ui.help}>
                      Recent sent campaigns · sample history
                    </Text>
                    {pastCampaigns.map((campaign) => (
                      <Pressable
                        key={campaign.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Reuse ${campaign.name}`}
                        onPress={() => {
                          const copy = campaignToSeed(campaign);
                          setBody(editableMessage(copy.body));
                          setName(copy.name);
                          setAudience(copy.audience);
                          setReusing(true);
                          setPastOpen(false);
                          setMessageError("");
                          resetSheetScroll();
                        }}
                        style={({ pressed }) => [
                          styles.reuseItem,
                          pressed && { backgroundColor: C.lilac },
                        ]}
                      >
                        <View style={ui.grow}>
                          <Text style={styles.optionTitle} numberOfLines={2}>
                            {campaign.name}
                          </Text>
                          <Text style={ui.help} numberOfLines={2}>
                            {editableMessage(campaign.body)}
                          </Text>
                        </View>
                        <Icon
                          name="arrow-up-right"
                          color={C.primary}
                          size={18}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

          {reusing && (
            <View style={styles.reuseNote}>
              <Icon name="rotate-ccw" color={C.primary} size={18} />
              <View style={ui.grow}>
                <Text style={styles.optionTitle}>Make it fresh</Text>
                <Text style={ui.help}>
                  Check dates, prices, and offer details. You’ll review the
                  audience and timing next.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.writer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start with an example"
              accessibilityState={{ expanded: writerOpen }}
              onPress={() => setWriterOpen(!writerOpen)}
              style={styles.writerToggle}
            >
              <View style={styles.writerMark}>
                <Icon name="edit-3" size={22} color={C.primary} />
              </View>
              <View style={ui.grow}>
                <Text style={styles.optionTitle}>Start with an example</Text>
                <Text style={ui.help}>
                  Offers, updates, and friendly follow-ups
                </Text>
              </View>
              <Icon
                name={writerOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={C.primary}
              />
            </Pressable>
            {writerOpen && (
              <View style={styles.writerContent}>
                <Text style={ui.body}>
                  Pick what you want to do. We’ll help with the details.
                </Text>
                <Text style={styles.fieldLabel}>What do you want to do?</Text>
                <View style={styles.choiceList}>
                  {GOALS.map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: writerGoal === item.value,
                      }}
                      onPress={() => setWriterGoal(item.value)}
                      style={[
                        styles.goalOption,
                        writerGoal === item.value && styles.optionSelected,
                      ]}
                    >
                      <View style={ui.grow}>
                        <Text style={styles.optionTitle}>{item.label}</Text>
                        <Text style={ui.help}>{item.detail}</Text>
                      </View>
                      <Radio selected={writerGoal === item.value} />
                    </Pressable>
                  ))}
                </View>
                {writerGoal === "promotion" ? (
                  <OfferBuilder
                    draft={offerDraft}
                    onChange={setOfferDraft}
                    hasMessage={Boolean(body.trim())}
                    onUseMessage={(message) => {
                      setBody(editableMessage(message));
                      setMessageError("");
                      completeGuide("writer");
                      setWriterOpen(false);
                      resetSheetScroll();
                    }}
                  />
                ) : (
                  <>
                    <Input
                      label="The details"
                      placeholder="Add your offer, event, or news. Include the action you want people to take."
                      value={details}
                      onChangeText={(value) => {
                        setDetails(value);
                        setDetailsError("");
                      }}
                      multiline
                      maxLength={1200}
                      style={styles.detailsInput}
                    />
                    {detailsError ? (
                      <Text accessibilityRole="alert" style={ui.error}>
                        {detailsError}
                      </Text>
                    ) : null}
                    <Text style={styles.fieldLabel}>Make it sound</Text>
                    <Chips
                      options={TONES.map((item) => item.label)}
                      value={
                        TONES.find((item) => item.value === tone)?.label ??
                        "Friendly"
                      }
                      onChange={(label) =>
                        setTone(
                          TONES.find((item) => item.label === label)?.value ??
                            "friendly",
                        )
                      }
                    />
                    <Button
                      title={
                        body.trim()
                          ? "Replace message with suggestion"
                          : "Create a starting point"
                      }
                      onPress={createStartingPoint}
                      icon="edit-3"
                      variant="secondary"
                    />
                    <Text style={ui.help}>
                      Uses your details to fill a writing template. You can edit
                      every word before saving.
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
          <Input
            label="Your message"
            placeholder="What would you like your customers to know?"
            value={body}
            onChangeText={(value) => {
              setBody(value);
              setMessageError("");
            }}
            multiline
            maxLength={1600}
            accessibilityLabel="Campaign message"
            style={styles.messageInput}
          />
          {messageError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {messageError}
            </Text>
          ) : null}
          <View style={styles.footerNote}>
            <Icon name="shield" size={17} color={C.green} />
            <Text style={styles.footerCopy}>
              Included automatically: Reply STOP to opt out.
            </Text>
          </View>
          <View style={ui.between}>
            <Text style={ui.help}>{sms.characters} encoded characters</Text>
            <Text style={ui.help}>
              {sms.segments} SMS segment{sms.segments === 1 ? "" : "s"} ·{" "}
              {sms.encoding}
            </Text>
          </View>

          <Button
            title="Next: choose audience"
            onPress={continueToAudience}
            icon="arrow-right"
          />
        </View>
      )}

      {step === 1 && (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text style={ui.h2}>Make it feel personal.</Text>
            <Text style={[ui.body, ui.muted]}>
              Choose the people this message is most useful for.
            </Text>
          </View>
          <View style={styles.choiceList}>
            {AUDIENCES.map((item) => {
              const count = getAudienceContacts(
                data.contacts,
                item.name,
              ).length;
              const total = data.contacts.filter(
                (contact) =>
                  item.name === "All subscribers" ||
                  contact.group === item.name,
              ).length;
              return (
                <Pressable
                  key={item.name}
                  accessibilityRole="radio"
                  accessibilityLabel={`${item.name}, ${count} subscribed contacts, ${total - count} opted out and excluded`}
                  accessibilityState={{ checked: audience === item.name }}
                  onPress={() => {
                    setAudience(item.name);
                    setAudienceError("");
                  }}
                  style={[
                    styles.audienceOption,
                    audience === item.name && styles.optionSelected,
                  ]}
                >
                  <View style={styles.audienceTop}>
                    <Radio selected={audience === item.name} />
                    <Text style={[styles.optionTitle, ui.grow]}>
                      {item.name}
                    </Text>
                    <Text style={styles.audienceCount}>{count}</Text>
                  </View>
                  <Text style={[ui.body, ui.muted]}>{item.description}</Text>
                  <Text style={ui.help}>
                    {count} subscribed · {total - count} opted out, excluded
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {audienceError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {audienceError}
            </Text>
          ) : null}
          <View style={styles.infoBox}>
            <Icon name="shield" size={21} color={C.green} />
            <View style={ui.grow}>
              <Text style={styles.optionTitle}>Only subscribed contacts</Text>
              <Text style={[ui.body, ui.muted]}>
                Opted-out contacts are automatically excluded from every
                audience.
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => goToStep(0)}
            />
            <View style={ui.grow}>
              <Button
                title="Next: review"
                icon="arrow-right"
                onPress={continueToReview}
              />
            </View>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text style={ui.h2}>A final look.</Text>
            <Text style={[ui.body, ui.muted]}>
              See your message the way your customers will.
            </Text>
          </View>

          <View style={styles.phonePreview}>
            <View style={styles.phoneTop}>
              <View style={styles.senderAvatar}>
                <Icon name="briefcase" size={22} color={C.primary} />
              </View>
              <Text style={styles.senderName}>Your business · preview</Text>
              <Text style={ui.help}>Text message</Text>
            </View>
            <View style={styles.messageBubble}>
              <Text style={styles.previewText}>{fullMessage}</Text>
            </View>
            <Text style={styles.previewCaption}>
              Message appearance may vary by device.
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{recipients}</Text>
              <Text style={ui.help}>recipients</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sms.segments}</Text>
              <Text style={ui.help}>SMS / person</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sms.segments * recipients}</Text>
              <Text style={ui.help}>est. segments</Text>
            </View>
          </View>
          <Text style={ui.help}>
            Includes the opt-out line · {sms.encoding} · {sms.characters}{" "}
            encoded characters
          </Text>

          <Input
            label="Campaign name"
            placeholder="A name for your campaign"
            value={name}
            maxLength={80}
            onChangeText={(value) => {
              setName(value);
              setNameError("");
              setSaveError("");
            }}
          />
          {nameError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {nameError}
            </Text>
          ) : null}
          <Text style={ui.help}>
            For your team only. Customers will not see this name.
          </Text>

          <View style={styles.heading}>
            <Text style={styles.fieldLabel}>When should this happen?</Text>
            <Text style={ui.help}>Preview timing · {timeZone}</Text>
          </View>
          <View style={styles.choiceList}>
            {initial?.scheduledAt && (
              <TimingOption
                selected={timing === "keep"}
                title="Keep current schedule"
                detail={displayDate(initial.scheduledAt)}
                onPress={() => chooseTiming("keep")}
              />
            )}
            <TimingOption
              selected={timing === "draft"}
              title="Save draft"
              detail="Come back and finish it when you are ready"
              onPress={() => chooseTiming("draft")}
            />
            <TimingOption
              selected={timing === "tomorrow"}
              title="Tomorrow at 10 AM"
              detail="A fresh start to the next day"
              onPress={() => chooseTiming("tomorrow")}
            />
            <TimingOption
              selected={timing === "later"}
              title="In 2 hours"
              detail="Give yourself a little time to prepare"
              onPress={() => chooseTiming("later")}
            />
          </View>
          {timingError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {timingError}
            </Text>
          ) : null}

          <Card style={styles.summary}>
            <View style={ui.between}>
              <Text style={styles.fieldLabel}>Your campaign</Text>
              <Badge label="Preview only" tone="purple" />
            </View>
            <View style={styles.summaryLine}>
              <Icon name="users" size={19} color={C.muted} />
              <Text style={ui.body}>
                {audience} · {recipients} subscribed
              </Text>
            </View>
            {excluded > 0 && (
              <Text style={ui.help}>
                {excluded} opted-out contact{excluded === 1 ? "" : "s"} excluded
              </Text>
            )}
            <View style={styles.summaryLine}>
              <Icon name="clock" size={19} color={C.muted} />
              <Text style={[ui.body, ui.grow]}>
                {scheduledAt
                  ? `${displayDate(scheduledAt)} · ${timeZone}`
                  : "Saved as a draft on this device"}
              </Text>
            </View>
            <Text style={[ui.body, ui.muted]}>
              Nothing will be sent. This saves a local preview for you to
              explore.
            </Text>
          </Card>
          {saveError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {saveError}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => goToStep(1)}
            />
            <View style={ui.grow}>
              <Button
                title={scheduledAt ? "Save preview schedule" : "Save draft"}
                icon="check"
                disabled={!ready}
                onPress={save}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioDot} />}
    </View>
  );
}

function TimingOption({
  selected,
  title,
  detail,
  onPress,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.timingOption, selected && styles.optionSelected]}
    >
      <Radio selected={selected} />
      <View style={ui.grow}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={ui.help}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reuseCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  reuseToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    minHeight: 72,
  },
  reuseList: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  reuseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 15,
  },
  reuseNote: {
    backgroundColor: C.lilac,
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  root: { gap: 24 },
  progress: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 18,
    padding: 8,
    gap: 4,
  },
  progressItem: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: { backgroundColor: C.primary, borderColor: C.primary },
  stepNumber: { fontSize: 14, color: C.muted, fontWeight: "700" },
  stepNumberActive: { color: C.white },
  stepLabel: { color: C.muted, fontSize: 14, fontWeight: "600" },
  stepLabelActive: { color: C.primary },
  section: { gap: 16 },
  heading: { gap: 6 },
  messageInput: {
    minHeight: 174,
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 24,
  },
  detailsInput: { minHeight: 106, textAlignVertical: "top" },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F0F8F4",
  },
  footerCopy: { color: C.ink, flex: 1, fontSize: 14, lineHeight: 20 },
  writer: {
    backgroundColor: C.lilac,
    borderRadius: 20,
    borderColor: C.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  writerToggle: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  writerMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  writerContent: { padding: 16, paddingTop: 0, gap: 16 },
  fieldLabel: { fontSize: 15, lineHeight: 21, color: C.ink, fontWeight: "700" },
  choiceList: { gap: 10 },
  goalOption: {
    backgroundColor: C.white,
    minHeight: 76,
    padding: 14,
    borderRadius: 14,
    borderColor: C.border,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: { backgroundColor: C.lilac, borderColor: C.primary },
  optionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: C.ink,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: C.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  audienceOption: {
    backgroundColor: C.white,
    gap: 8,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  audienceTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  audienceCount: { color: C.primary, fontSize: 24, fontWeight: "700" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    backgroundColor: "#F0F8F4",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 6,
  },
  phonePreview: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 28,
    backgroundColor: "#F5F6FA",
    padding: 20,
    gap: 20,
  },
  phoneTop: { alignItems: "center", gap: 5 },
  senderAvatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: C.white,
    marginBottom: 3,
  },
  senderName: { fontSize: 14, fontWeight: "700", color: C.ink },
  messageBubble: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8EAF0",
    alignSelf: "stretch",
  },
  previewText: { fontSize: 16, lineHeight: 25, color: C.ink },
  previewCaption: {
    textAlign: "center",
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: { flexDirection: "row", paddingVertical: 6, gap: 8 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, lineHeight: 32, color: C.ink, fontWeight: "700" },
  timingOption: {
    minHeight: 78,
    padding: 15,
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summary: { gap: 13 },
  summaryLine: { flexDirection: "row", alignItems: "center", gap: 10 },
});

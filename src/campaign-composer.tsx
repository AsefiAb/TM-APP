import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ALL_SUBSCRIBERS,
  CAMPAIGN_TYPES,
  Campaign,
  CampaignType,
  getAudienceContacts,
  getGroups,
  getSmsInfo,
} from "./domain";
import {
  CampaignGoal,
  CampaignSeed,
  WriterTone,
  campaignToSeed,
  saveCampaign,
  suggestMessage,
  withOptOut,
} from "./sam";
import { estimateImpact, formatMoney } from "./ideas";
import { useWorkspace } from "./store";
import { emptyOfferDraft } from "./offers";
import { hasPassed, isPastDue, parseCustomDateTime, tomorrowMorning } from "./schedule";
import { OfferBuilder } from "./offer-builder";
import {
  Badge,
  Button,
  C,
  Card,
  Chips,
  F,
  Icon,
  Input,
  ProgressBar,
  R,
  Radio,
  t,
  ui,
  useSheetScroll,
} from "./ui";

/** The five steps of the SAM 3.0 Create New Campaign wizard. */
const STEPS = [
  "Campaign Details",
  "Message Content",
  "Audience",
  "Schedule",
  "Review",
] as const;

const GOALS: { value: CampaignGoal; label: string; detail: string }[] = [
  { value: "promotion", label: "Share an offer", detail: "Give people a reason to visit" },
  { value: "reengage", label: "Reconnect", detail: "Welcome your customers back" },
  { value: "update", label: "Send an update", detail: "Keep your community in the loop" },
];
const TONES: { value: WriterTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "energetic", label: "Energetic" },
];
const TYPE_DETAILS: Record<CampaignType, string> = {
  SMS: "Text message · up to 1,600 characters",
  MMS: "Picture or video message · available in SAM on the web",
  RCS: "Rich messaging · available in SAM on the web",
};

type Timing = "draft" | "keep" | "tomorrow" | "custom";
const EXPIRED_TIMING =
  "That time has passed. Choose a later time or save this as a draft.";

// The footer has its own visible home in the editor and is added once on save.
function editableMessage(value: string) {
  return value.replace(/(?:\s*Reply STOP to opt out\.?\s*)+$/i, "").trim();
}

function displayDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function splitDateTime(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours();
  return {
    date: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`,
    time: `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}`,
    meridiem: hours >= 12 ? ("PM" as const) : ("AM" as const),
  };
}

export function CampaignComposer({
  initial,
  seed,
  businessName,
  startWithWriter = false,
  onSaved,
  onDirtyChange,
  onDeleteRequest,
  onMarkSentRequest,
}: {
  initial?: Campaign;
  /** Prefilled content from an idea or a reused campaign; saving creates a new campaign. */
  seed?: CampaignSeed;
  businessName: string;
  startWithWriter?: boolean;
  onSaved: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onDeleteRequest?: () => void;
  onMarkSentRequest?: () => void;
}) {
  const { data, ready, update } = useWorkspace();
  const resetSheetScroll = useSheetScroll();
  const groups = getGroups(data);
  const audiences = [ALL_SUBSCRIBERS, ...groups];
  const editable = !initial || initial.status !== "sent";
  const starting = initial ?? seed;
  const ideaId = initial?.ideaId ?? seed?.ideaId;
  const estimate = initial?.estimate ?? seed?.estimate;
  const seedSchedule =
    !initial && seed?.scheduledAt ? splitDateTime(seed.scheduledAt) : undefined;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(starting?.name ?? "");
  const [type, setType] = useState<CampaignType>(initial?.type ?? "SMS");
  const [body, setBody] = useState(() => editableMessage(starting?.body ?? ""));
  const [audience, setAudience] = useState(
    starting && audiences.includes(starting.audience)
      ? starting.audience
      : ALL_SUBSCRIBERS,
  );
  const [pastOpen, setPastOpen] = useState(false);
  const [reusing, setReusing] = useState(Boolean(seed));
  const pastCampaigns = data.campaigns
    .filter((campaign) => campaign.status === "sent")
    .slice(0, 5);
  const [writerOpen, setWriterOpen] = useState(startWithWriter);
  const [writerGoal, setWriterGoal] = useState<CampaignGoal>("promotion");
  const [tone, setTone] = useState<WriterTone>("friendly");
  const [details, setDetails] = useState("");
  const [offerDraft, setOfferDraft] = useState(() => ({
    ...emptyOfferDraft(),
    businessName,
  }));
  const [timing, setTiming] = useState<Timing>(
    initial?.scheduledAt ? "keep" : seedSchedule ? "custom" : "draft",
  );
  const [customDate, setCustomDate] = useState(seedSchedule?.date ?? "");
  const [customTime, setCustomTime] = useState(seedSchedule?.time ?? "");
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(
    seedSchedule?.meridiem ?? "AM",
  );
  const [nameError, setNameError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [timingError, setTimingError] = useState(() =>
    initial && isPastDue(initial) ? EXPIRED_TIMING : "",
  );
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const scheduledAt: string | undefined = (() => {
    if (timing === "keep") return initial?.scheduledAt;
    if (timing === "tomorrow") return tomorrowMorning().toISOString();
    if (timing === "custom") {
      const parsed = parseCustomDateTime(customDate, customTime, meridiem);
      return parsed ? parsed.toISOString() : undefined;
    }
    return undefined;
  })();

  const dirty =
    reusing ||
    name !== (initial?.name ?? "") ||
    type !== (initial?.type ?? "SMS") ||
    body !== editableMessage(initial?.body ?? "") ||
    audience !== (initial?.audience ?? ALL_SUBSCRIBERS) ||
    scheduledAt !== initial?.scheduledAt ||
    details !== "" ||
    JSON.stringify(offerDraft) !==
      JSON.stringify({ ...emptyOfferDraft(), businessName });
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const fullMessage = withOptOut(body);
  const sms = getSmsInfo(fullMessage);
  const recipients = getAudienceContacts(data.contacts, audience, groups).length;
  const audienceTotal = data.contacts.filter(
    (contact) => audience === ALL_SUBSCRIBERS || contact.group === audience,
  ).length;
  const excluded = audienceTotal - recipients;
  let projected: ReturnType<typeof estimateImpact> | null = null;
  if (estimate) {
    try {
      projected = estimateImpact({ recipients, segments: sms.segments, estimate });
    } catch {
      projected = null;
    }
  }

  const goToStep = (next: number) => {
    setStep(next);
    setSaveError("");
    resetSheetScroll();
  };

  const continueFromDetails = () => {
    if (!name.trim()) {
      setNameError("Enter a campaign name.");
      return;
    }
    setNameError("");
    goToStep(1);
  };

  const continueFromMessage = () => {
    if (!/[\p{L}\p{N}]/u.test(editableMessage(body))) {
      setMessageError("Write a message for your subscribers before continuing.");
      return;
    }
    if (fullMessage.length > 1600) {
      setMessageError(
        "Shorten your message to 1,600 characters, including the opt-out line.",
      );
      return;
    }
    setMessageError("");
    goToStep(2);
  };

  const continueFromSchedule = () => {
    if (timing === "custom" && !scheduledAt) {
      setTimingError("Enter the date as MM/DD/YYYY and the time as h:mm.");
      return;
    }
    if (scheduledAt && hasPassed(scheduledAt)) {
      setTimingError(EXPIRED_TIMING);
      return;
    }
    setTimingError("");
    goToStep(4);
  };

  const createStartingPoint = () => {
    if (!details.trim()) {
      setDetailsError("Add the details you want your subscribers to know.");
      return;
    }
    try {
      const suggestion = suggestMessage({
        goal: writerGoal,
        tone,
        details,
        businessName,
      });
      setBody(editableMessage(suggestion));
      setDetailsError("");
      setMessageError("");
    } catch (error) {
      setDetailsError(
        error instanceof Error ? error.message : "Check your details and try again.",
      );
    }
  };

  const save = async () => {
    if (scheduledAt && hasPassed(scheduledAt)) {
      setTimingError(EXPIRED_TIMING);
      goToStep(3);
      return;
    }
    if (!ready) return;
    setSaving(true);
    try {
      const next = saveCampaign(data, {
        ...(initial ? { id: initial.id } : {}),
        name,
        body: fullMessage,
        audience,
        type,
        scheduledAt,
        ideaId,
        estimate,
        allowEmptyDraft: true,
      });
      await update(next);
      onSaved(
        scheduledAt
          ? `“${name.trim()}” is scheduled for ${displayDate(scheduledAt)} on this device.`
          : `“${name.trim()}” was saved as a draft.`,
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Your campaign could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <View style={styles.root}>
      <View
        style={styles.progress}
        accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}, ${percent} percent complete`}
      >
        <View style={ui.between}>
          <Text style={styles.progressLabel}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text style={styles.progressLabel}>{percent}% Complete</Text>
        </View>
        <ProgressBar value={step + 1} max={STEPS.length} />
        <View style={styles.stepRow}>
          {STEPS.map((label, index) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={`${label}${index === step ? ", current step" : ""}`}
              accessibilityState={{
                disabled: index > step && !initial,
                selected: index === step,
              }}
              disabled={index > step && !initial}
              onPress={() => goToStep(index)}
              style={styles.stepItem}
            >
              <View
                style={[
                  styles.stepDot,
                  index < step && styles.stepDone,
                  index === step && styles.stepCurrent,
                ]}
              >
                {index < step ? (
                  <Icon name="check" size={11} color={C.white} />
                ) : (
                  <Text
                    style={[styles.stepNumber, index === step && styles.stepNumberCurrent]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={styles.stepTitle}>{STEPS[step]}</Text>
      </View>

      {!editable && (
        <View style={styles.infoBox}>
          <Icon name="info" size={18} color={C.primary} />
          <Text style={[t.help, ui.grow]}>
            Sent campaigns cannot be edited. Use “Send Campaign” to start a new one.
          </Text>
        </View>
      )}

      {step === 0 && (
        <View style={styles.section}>
          <Text style={t.help}>Basic campaign information</Text>
          <Input
            label="Campaign Name"
            required
            placeholder="Enter campaign name"
            value={name}
            maxLength={80}
            onChangeText={(value) => {
              setName(value);
              setNameError("");
            }}
            error={nameError}
            help="For your team only. Subscribers will not see this name."
          />
          <View style={styles.field}>
            <Text style={t.label}>
              Campaign Type<Text style={{ color: C.red }}> *</Text>
            </Text>
            {CAMPAIGN_TYPES.map((option) => {
              const enabled = option === "SMS";
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option} message`}
                  accessibilityState={{ checked: type === option, disabled: !enabled }}
                  disabled={!enabled}
                  onPress={() => setType(option)}
                  style={[
                    styles.option,
                    type === option && styles.optionSelected,
                    !enabled && styles.optionDisabled,
                  ]}
                >
                  <Radio selected={type === option} />
                  <View style={ui.grow}>
                    <Text style={styles.optionTitle}>{option} Message</Text>
                    <Text style={t.small}>{TYPE_DETAILS[option]}</Text>
                  </View>
                  {!enabled ? <Badge label="Web" tone="gray" /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.field}>
            <Text style={t.label}>Sender</Text>
            <View style={styles.senderRow}>
              <Icon name="phone" size={17} color={C.muted} />
              <View style={ui.grow}>
                <Text style={styles.optionTitle}>Your SAM number</Text>
                <Text style={t.small}>
                  Sender numbers are assigned in SAM → My Numbers. Sending
                  happens when the app is connected to your account.
                </Text>
              </View>
            </View>
          </View>
          <Button title="Next" icon="arrow-right" onPress={continueFromDetails} />
        </View>
      )}

      {step === 1 && (
        <View style={styles.section}>
          <Text style={t.help}>
            One clear message and one easy next step for your subscriber.
          </Text>

          {!initial && !reusing && !body.trim() && !writerOpen && pastCampaigns.length > 0 && (
            <View style={styles.reuseCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use a past message"
                accessibilityState={{ expanded: pastOpen }}
                onPress={() => setPastOpen(!pastOpen)}
                style={styles.reuseToggle}
              >
                <Icon name="rotate-ccw" color={C.primary} size={20} />
                <View style={ui.grow}>
                  <Text style={styles.optionTitle}>Use a past message</Text>
                  <Text style={t.help}>A fresh version of your own words.</Text>
                </View>
                <Icon
                  name={pastOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={C.primary}
                />
              </Pressable>
              {pastOpen && (
                <View style={styles.reuseList}>
                  {pastCampaigns.map((campaign) => (
                    <Pressable
                      key={campaign.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Reuse ${campaign.name}`}
                      onPress={() => {
                        const copy = campaignToSeed(campaign);
                        setBody(editableMessage(copy.body));
                        if (!name.trim()) setName(copy.name);
                        if (audiences.includes(copy.audience)) setAudience(copy.audience);
                        setReusing(true);
                        setPastOpen(false);
                        setMessageError("");
                        resetSheetScroll();
                      }}
                      style={({ pressed }) => [
                        styles.reuseItem,
                        pressed && { backgroundColor: C.primarySoft },
                      ]}
                    >
                      <View style={ui.grow}>
                        <Text style={styles.optionTitle} numberOfLines={2}>
                          {campaign.name}
                        </Text>
                        <Text style={t.help} numberOfLines={2}>
                          {editableMessage(campaign.body)}
                        </Text>
                      </View>
                      <Icon name="arrow-up-right" color={C.primary} size={18} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {reusing && (
            <View style={styles.infoBox}>
              <Icon name="rotate-ccw" color={C.primary} size={18} />
              <View style={ui.grow}>
                <Text style={styles.optionTitle}>Make it fresh</Text>
                <Text style={t.help}>
                  Check dates, prices, and offer details before continuing.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.writer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="SAM AI Assist: start with an example"
              accessibilityState={{ expanded: writerOpen }}
              onPress={() => setWriterOpen(!writerOpen)}
              style={styles.writerToggle}
            >
              <View style={styles.writerMark}>
                <Icon name="zap" size={20} color={C.primary} />
              </View>
              <View style={ui.grow}>
                <Text style={styles.optionTitle}>
                  SAM<Text style={{ color: C.primary }}>AI</Text> Assist
                </Text>
                <Text style={t.help}>Offers, updates, and friendly follow-ups</Text>
              </View>
              <Icon
                name={writerOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={C.primary}
              />
            </Pressable>
            {writerOpen && (
              <View style={styles.writerContent}>
                <Text style={t.label}>What do you want to do?</Text>
                <View style={styles.choiceList}>
                  {GOALS.map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ checked: writerGoal === item.value }}
                      onPress={() => setWriterGoal(item.value)}
                      style={[
                        styles.option,
                        writerGoal === item.value && styles.optionSelected,
                      ]}
                    >
                      <Radio selected={writerGoal === item.value} />
                      <View style={ui.grow}>
                        <Text style={styles.optionTitle}>{item.label}</Text>
                        <Text style={t.small}>{item.detail}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                {writerGoal === "promotion" ? (
                  <OfferBuilder
                    customerMode
                    draft={offerDraft}
                    onChange={setOfferDraft}
                    hasMessage={Boolean(body.trim())}
                    onUseMessage={(message) => {
                      setBody(editableMessage(message));
                      setMessageError("");
                      setWriterOpen(false);
                      resetSheetScroll();
                    }}
                  />
                ) : (
                  <>
                    <Input
                      label="The details"
                      placeholder="Add your event, news, or reason to visit. Include the action you want people to take."
                      value={details}
                      onChangeText={(value) => {
                        setDetails(value);
                        setDetailsError("");
                      }}
                      multiline
                      maxLength={1200}
                      style={styles.detailsInput}
                      error={detailsError}
                    />
                    <Text style={t.label}>Make it sound</Text>
                    <Chips
                      options={TONES.map((item) => item.label)}
                      value={TONES.find((item) => item.value === tone)?.label ?? "Friendly"}
                      onChange={(label) =>
                        setTone(TONES.find((item) => item.label === label)?.value ?? "friendly")
                      }
                    />
                    <Button
                      title={body.trim() ? "Replace message with suggestion" : "Create a starting point"}
                      onPress={createStartingPoint}
                      icon="edit-3"
                      variant="outlinePrimary"
                    />
                    <Text style={t.small}>
                      Uses your details to fill a writing template on this device.
                      You can edit every word before saving.
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          <Input
            label="Message"
            required
            placeholder="What would you like your subscribers to know?"
            value={body}
            onChangeText={(value) => {
              setBody(value);
              setMessageError("");
            }}
            multiline
            maxLength={1600}
            accessibilityLabel="Campaign message"
            style={styles.messageInput}
            error={messageError}
          />
          <View style={styles.footerNote}>
            <Icon name="shield" size={16} color={C.green} />
            <Text style={styles.footerCopy}>
              Added automatically: “Reply STOP to opt out.”
            </Text>
          </View>
          <View style={ui.between}>
            <Text style={t.small}>{sms.characters} characters · {sms.encoding}</Text>
            <Text style={t.small}>
              {sms.segments} SMS segment{sms.segments === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Button title="Previous" variant="outline" onPress={() => goToStep(0)} />
            <View style={ui.grow}>
              <Button title="Next" icon="arrow-right" onPress={continueFromMessage} />
            </View>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={t.help}>
            Choose who receives this campaign. Opted-out subscribers are always excluded.
          </Text>
          <View style={styles.choiceList}>
            {audiences.map((item) => {
              const count = getAudienceContacts(data.contacts, item, groups).length;
              const total = data.contacts.filter(
                (contact) => item === ALL_SUBSCRIBERS || contact.group === item,
              ).length;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={`${item}, ${count} subscribed, ${total - count} opted out`}
                  accessibilityState={{ checked: audience === item }}
                  onPress={() => setAudience(item)}
                  style={[styles.option, audience === item && styles.optionSelected]}
                >
                  <Radio selected={audience === item} />
                  <View style={ui.grow}>
                    <Text style={styles.optionTitle}>{item}</Text>
                    <Text style={t.small}>
                      {count} subscribed
                      {total - count > 0 ? ` · ${total - count} opted out` : ""}
                    </Text>
                  </View>
                  <Text style={styles.audienceCount}>{count}</Text>
                </Pressable>
              );
            })}
          </View>
          {recipients === 0 && (
            <View style={styles.infoBox}>
              <Icon name="users" size={18} color={C.primary} />
              <Text style={[t.help, ui.grow]}>
                No subscribers in this audience yet. You can still save the
                campaign and add subscribers later.
              </Text>
            </View>
          )}
          <View style={styles.actionRow}>
            <Button title="Previous" variant="outline" onPress={() => goToStep(1)} />
            <View style={ui.grow}>
              <Button title="Next" icon="arrow-right" onPress={() => goToStep(3)} />
            </View>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={t.help}>
            Save a draft or choose a time. Schedules are saved on this device and
            run through SAM once the app is connected to your account.
          </Text>
          <View style={styles.choiceList}>
            {initial?.scheduledAt && (
              <TimingOption
                selected={timing === "keep"}
                title="Keep current schedule"
                detail={displayDate(initial.scheduledAt)}
                onPress={() => {
                  setTiming("keep");
                  setTimingError("");
                }}
              />
            )}
            <TimingOption
              selected={timing === "draft"}
              title="Save as draft"
              detail="Come back and finish it when you are ready"
              onPress={() => {
                setTiming("draft");
                setTimingError("");
              }}
            />
            <TimingOption
              selected={timing === "tomorrow"}
              title="Tomorrow at 10:00 AM"
              detail="A fresh start to the next day"
              onPress={() => {
                setTiming("tomorrow");
                setTimingError("");
              }}
            />
            <TimingOption
              selected={timing === "custom"}
              title="Choose a date and time"
              detail="Pick the exact moment"
              onPress={() => {
                setTiming("custom");
                setTimingError("");
              }}
            />
          </View>
          {timing === "custom" && (
            <View style={styles.customTiming}>
              <View style={styles.customRow}>
                <View style={ui.grow}>
                  <Input
                    label="Date"
                    placeholder="MM/DD/YYYY"
                    value={customDate}
                    onChangeText={(value) => {
                      setCustomDate(value);
                      setTimingError("");
                    }}
                    inputMode="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.timeField}>
                  <Input
                    label="Time"
                    placeholder="10:00"
                    value={customTime}
                    onChangeText={(value) => {
                      setCustomTime(value);
                      setTimingError("");
                    }}
                    inputMode="numeric"
                    maxLength={5}
                  />
                </View>
              </View>
              <Chips
                options={["AM", "PM"]}
                value={meridiem}
                onChange={(value) => setMeridiem(value === "PM" ? "PM" : "AM")}
              />
              <Text style={t.small}>
                Uses your device time zone (
                {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}).
              </Text>
            </View>
          )}
          {timingError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {timingError}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <Button title="Previous" variant="outline" onPress={() => goToStep(2)} />
            <View style={ui.grow}>
              <Button title="Next" icon="arrow-right" onPress={continueFromSchedule} />
            </View>
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={styles.section}>
          <Text style={t.help}>See your message the way your subscribers will.</Text>
          <View style={styles.phonePreview}>
            <View style={styles.phoneTop}>
              <View style={styles.senderAvatar}>
                <Icon name="briefcase" size={20} color={C.primary} />
              </View>
              <Text style={styles.senderName}>{businessName}</Text>
              <Text style={t.small}>{type} · Text Message</Text>
            </View>
            <View style={styles.messageBubble}>
              <Text style={styles.previewText}>{fullMessage}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{recipients}</Text>
              <Text style={t.small}>recipients</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sms.segments}</Text>
              <Text style={t.small}>SMS / person</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sms.segments * recipients}</Text>
              <Text style={t.small}>est. messages</Text>
            </View>
          </View>

          {projected ? (
            <View style={styles.projection}>
              <View style={ui.between}>
                <Text style={t.h3}>Projected impact</Text>
                <Badge label="Estimate" tone="blue" />
              </View>
              <View style={styles.projectionRow}>
                <ProjectionStat label="Read it" value={String(projected.reached)} />
                <ProjectionStat label="Redeem" value={String(projected.redemptions)} />
                <ProjectionStat label="Revenue" value={formatMoney(projected.revenue)} />
                <ProjectionStat label="Cost" value={formatMoney(projected.messageCost)} />
              </View>
              <Text style={t.small}>
                {recipients === 0
                  ? "Add subscribers to this audience to see a projection."
                  : "From your inputs and a 98% SMS open rate (textmunication.com). Log real results after sending."}
              </Text>
            </View>
          ) : null}

          <Card style={styles.summary}>
            <SummaryLine icon="tag" text={name.trim() || "Untitled campaign"} />
            <SummaryLine
              icon="users"
              text={`${audience} · ${recipients} subscribed${
                excluded > 0 ? ` · ${excluded} opted out excluded` : ""
              }`}
            />
            <SummaryLine
              icon="clock"
              text={scheduledAt ? `Scheduled · ${displayDate(scheduledAt)}` : "Saved as a draft"}
            />
            <SummaryLine
              icon="smartphone"
              text="Saved on this device. Sending runs through your SAM account once the app is connected."
            />
          </Card>
          {saveError ? (
            <Text accessibilityRole="alert" style={ui.error}>
              {saveError}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <Button title="Previous" variant="outline" onPress={() => goToStep(3)} />
            <View style={ui.grow}>
              <Button
                title={saving ? "Saving…" : scheduledAt ? "Schedule Campaign" : "Save Draft"}
                icon="check"
                disabled={!ready || saving || !editable}
                onPress={save}
              />
            </View>
          </View>
          {onMarkSentRequest && editable ? (
            <Button
              title="Mark as sent in SAM"
              icon="check-circle"
              variant="outline"
              onPress={onMarkSentRequest}
            />
          ) : null}
          {onDeleteRequest && editable ? (
            <Button
              title="Delete campaign"
              icon="trash-2"
              variant="ghost"
              onPress={onDeleteRequest}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function ProjectionStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.projectionStat}>
      <Text style={styles.projectionValue}>{value}</Text>
      <Text style={t.small}>{label}</Text>
    </View>
  );
}

function SummaryLine({ icon, text }: { icon: React.ComponentProps<typeof Icon>["name"]; text: string }) {
  return (
    <View style={styles.summaryLine}>
      <Icon name={icon} size={18} color={C.muted} />
      <Text style={[t.body, ui.grow]}>{text}</Text>
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
      accessibilityLabel={title}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Radio selected={selected} />
      <View style={ui.grow}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={t.small}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: 20 },
  progress: { gap: 10 },
  progressLabel: { color: C.text, fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  stepRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  stepItem: { minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: { backgroundColor: C.primary, borderColor: C.primary },
  stepCurrent: { borderColor: C.primary, backgroundColor: C.primarySoft },
  stepNumber: { fontFamily: F.semibold, fontSize: 12, color: C.muted },
  stepNumberCurrent: { color: C.primary },
  stepTitle: { color: C.ink, fontFamily: F.bold, fontSize: 18, lineHeight: 24 },
  section: { gap: 16 },
  field: { gap: 8 },
  option: {
    backgroundColor: C.white,
    minHeight: 60,
    padding: 13,
    borderRadius: R.lg,
    borderColor: C.border,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: { backgroundColor: C.primarySoft, borderColor: C.primary },
  optionDisabled: { opacity: 0.55 },
  optionTitle: { fontFamily: F.semibold, fontSize: 15, lineHeight: 21, color: C.ink },
  senderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
    borderRadius: R.lg,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  reuseCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  reuseToggle: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 64 },
  reuseList: { paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  reuseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
  },
  writer: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderColor: C.primaryBorder,
    borderWidth: 1,
    overflow: "hidden",
  },
  writerToggle: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  writerMark: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primarySoft,
  },
  writerContent: { padding: 14, paddingTop: 0, gap: 14 },
  choiceList: { gap: 10 },
  audienceCount: { color: C.primary, fontFamily: F.bold, fontSize: 20, lineHeight: 26 },
  messageInput: { minHeight: 160, fontSize: 16, lineHeight: 24 },
  detailsInput: { minHeight: 100 },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: R.md,
    backgroundColor: C.greenSoft,
  },
  footerCopy: { color: "#166534", fontFamily: F.medium, flex: 1, fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  customTiming: { gap: 10 },
  customRow: { flexDirection: "row", gap: 10 },
  timeField: { width: 110 },
  phonePreview: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.xl,
    backgroundColor: C.bg,
    padding: 18,
    gap: 16,
  },
  phoneTop: { alignItems: "center", gap: 4 },
  senderAvatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 2,
  },
  senderName: { fontFamily: F.semibold, fontSize: 14, lineHeight: 20, color: C.ink },
  messageBubble: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: "stretch",
  },
  previewText: { fontFamily: F.regular, fontSize: 16, lineHeight: 24, color: C.ink },
  statsRow: { flexDirection: "row", paddingVertical: 4, gap: 8 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: F.bold, fontSize: 24, lineHeight: 30, color: C.ink },
  summary: { gap: 12 },
  summaryLine: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  projection: {
    gap: 10,
    padding: 14,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
  },
  projectionRow: { flexDirection: "row", gap: 8 },
  projectionStat: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  projectionValue: { color: C.ink, fontFamily: F.bold, fontSize: 17, lineHeight: 22 },
});

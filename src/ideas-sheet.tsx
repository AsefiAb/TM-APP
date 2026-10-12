import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ALL_SUBSCRIBERS, getSmsInfo } from "./domain";
import {
  CampaignIdea,
  SMS_OPEN_RATE,
  estimateImpact,
  formatMoney,
  ideasForIndustry,
  suggestedSendTime,
} from "./ideas";
import { CampaignSeed, withOptOut } from "./sam";
import { Badge, Button, C, F, Icon, Input, R, Sheet, t, ui, useSheetScroll } from "./ui";

/**
 * Campaign ideas with a "why this works" projection. Every number except the
 * advertised SMS open rate comes from the owner's own inputs.
 */
export function IdeasSheet({
  visible,
  industry,
  businessName,
  subscriberCount,
  onClose,
  onCreate,
}: {
  visible: boolean;
  industry: string;
  businessName: string;
  subscriberCount: number;
  onClose: () => void;
  onCreate: (seed: CampaignSeed) => void;
}) {
  const [selected, setSelected] = useState<CampaignIdea | null>(null);
  return (
    <Sheet
      visible={visible}
      title={selected ? selected.title : "Campaign ideas"}
      subtitle={
        selected
          ? selected.hook
          : `Ideas for ${industry.toLowerCase() === "other" ? "your business" : industry.toLowerCase()} with a projection before you send`
      }
      onClose={() => {
        setSelected(null);
        onClose();
      }}
      scrollKey={selected?.id ?? "list"}
    >
      {visible && !selected ? (
        <IdeaList industry={industry} onSelect={setSelected} />
      ) : null}
      {visible && selected ? (
        <IdeaDetail
          key={selected.id}
          idea={selected}
          businessName={businessName}
          subscriberCount={subscriberCount}
          onBack={() => setSelected(null)}
          onCreate={(seed) => {
            setSelected(null);
            onCreate(seed);
          }}
        />
      ) : null}
    </Sheet>
  );
}

function IdeaList({
  industry,
  onSelect,
}: {
  industry: string;
  onSelect: (idea: CampaignIdea) => void;
}) {
  const ideas = ideasForIndustry(industry);
  return (
    <View style={ui.stack}>
      <View style={s.tip}>
        <Icon name="trending-up" size={18} color={C.primary} />
        <Text style={[t.help, ui.grow]}>
          Pick an idea for a slow day, a lunch rush, or a weekend push. Each
          one shows who it reaches and what it could bring in.
        </Text>
      </View>
      {ideas.map((idea) => (
        <Pressable
          key={idea.id}
          accessibilityRole="button"
          accessibilityLabel={idea.title}
          onPress={() => onSelect(idea)}
          style={({ pressed }) => [s.ideaRow, pressed && s.pressed]}
        >
          <View style={s.ideaIcon}>
            <Icon
              name={
                idea.goal === "promotion"
                  ? "tag"
                  : idea.goal === "reengage"
                    ? "heart"
                    : "bell"
              }
              size={18}
              color={C.primary}
            />
          </View>
          <View style={ui.grow}>
            <Text style={s.ideaTitle}>{idea.title}</Text>
            <Text style={t.help}>{idea.hook}</Text>
            <View style={s.tags}>
              {idea.tags.map((tag) => (
                <Badge key={tag} label={tag} tone={tag === "Today" ? "pink" : "gray"} />
              ))}
            </View>
          </View>
          <Icon name="chevron-right" size={18} color={C.faint} />
        </Pressable>
      ))}
    </View>
  );
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function IdeaDetail({
  idea,
  businessName,
  subscriberCount,
  onBack,
  onCreate,
}: {
  idea: CampaignIdea;
  businessName: string;
  subscriberCount: number;
  onBack: () => void;
  onCreate: (seed: CampaignSeed) => void;
}) {
  const resetScroll = useSheetScroll();
  const [value, setValue] = useState(String(idea.defaultValue));
  const [reach, setReach] = useState(String(subscriberCount));
  const [redemption, setRedemption] = useState(
    String(Math.round(idea.defaults.redemptionRate * 100)),
  );
  const [ticket, setTicket] = useState(String(idea.defaults.averageTicket));
  const [cost, setCost] = useState(String(idea.defaults.costPerMessage));
  const [error, setError] = useState("");

  const offerValue = idea.valueKind ? toNumber(value) : idea.defaultValue;
  const message = idea.message(
    businessName,
    Number.isFinite(offerValue) ? offerValue : idea.defaultValue,
  );
  const fullMessage = withOptOut(message);
  const sms = getSmsInfo(fullMessage);
  const estimate = {
    redemptionRate: toNumber(redemption) / 100,
    averageTicket: toNumber(ticket),
    costPerMessage: toNumber(cost),
  };
  let impact: ReturnType<typeof estimateImpact> | null = null;
  let impactError = "";
  try {
    impact = estimateImpact({
      recipients: toNumber(reach),
      segments: sms.segments,
      estimate,
    });
  } catch (caught) {
    impactError = caught instanceof Error ? caught.message : "Check the numbers.";
  }
  const sendTime = suggestedSendTime(idea);
  const sendLabel = sendTime.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={ui.stack}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to ideas"
        onPress={() => {
          onBack();
          resetScroll();
        }}
        style={({ pressed }) => [s.back, pressed && s.pressed]}
      >
        <Icon name="arrow-left" size={16} color={C.text} />
        <Text style={s.backText}>All ideas</Text>
      </Pressable>

      <View style={s.preview}>
        <Text style={s.previewLabel}>MESSAGE</Text>
        <Text style={s.previewText}>{fullMessage}</Text>
        <Text style={t.small}>
          {sms.segments} SMS segment{sms.segments === 1 ? "" : "s"} · editable in the next step
        </Text>
      </View>

      {idea.valueKind ? (
        <Input
          label={idea.valueKind === "percent" ? "Discount (%)" : "Savings ($)"}
          value={value}
          onChangeText={(next) => {
            setValue(next);
            setError("");
          }}
          inputMode="decimal"
          maxLength={6}
        />
      ) : null}

      <View style={s.whyCard}>
        <View style={ui.row}>
          <Icon name="zap" size={18} color={C.primary} />
          <Text style={t.h3}>Why this works</Text>
        </View>
        {idea.why.map((line) => (
          <View key={line} style={s.whyLine}>
            <Icon name="check" size={15} color={C.green} />
            <Text style={[t.body, ui.grow]}>{line}</Text>
          </View>
        ))}
        <View style={s.whyLine}>
          <Icon name="clock" size={15} color={C.primary} />
          <Text style={[t.body, ui.grow]}>
            Suggested send time: {sendLabel}
          </Text>
        </View>
      </View>

      <Text style={t.h3}>What it could bring in</Text>
      <Text style={t.help}>
        Adjust the numbers to match your business. This is a simple estimate
        from your inputs, not a guarantee.
      </Text>
      <View style={s.inputRow}>
        <View style={ui.grow}>
          <Input
            label="Subscribers to reach"
            value={reach}
            onChangeText={setReach}
            inputMode="numeric"
            maxLength={7}
            help={subscriberCount === 0 ? "You have no subscribers yet; try a number to see the potential." : `${subscriberCount} subscribed today`}
          />
        </View>
        <View style={s.narrow}>
          <Input
            label="Redeem (%)"
            value={redemption}
            onChangeText={setRedemption}
            inputMode="decimal"
            maxLength={5}
          />
        </View>
      </View>
      <View style={s.inputRow}>
        <View style={ui.grow}>
          <Input
            label="Average sale ($)"
            value={ticket}
            onChangeText={setTicket}
            inputMode="decimal"
            maxLength={8}
          />
        </View>
        <View style={ui.grow}>
          <Input
            label="Cost per message ($)"
            value={cost}
            onChangeText={setCost}
            inputMode="decimal"
            maxLength={7}
            help="Your plan's overage rate"
          />
        </View>
      </View>

      {impact ? (
        <View style={s.impact}>
          <View style={s.impactRow}>
            <ImpactStat label="Read it" value={String(impact.reached)} caption={`${Math.round(SMS_OPEN_RATE * 100)}% open rate`} />
            <ImpactStat label="Redeem" value={String(impact.redemptions)} caption={`${redemption || 0}% of readers`} />
          </View>
          <View style={s.impactRow}>
            <ImpactStat label="Est. revenue" value={formatMoney(impact.revenue)} caption={`${impact.redemptions} × ${formatMoney(estimate.averageTicket)}`} />
            <ImpactStat label="Message cost" value={formatMoney(impact.messageCost)} caption={`${toNumber(reach) || 0} × ${Math.max(1, sms.segments)} segment${sms.segments === 1 ? "" : "s"}`} />
          </View>
          <View style={s.netRow}>
            <Text style={s.netLabel}>Estimated net</Text>
            <Text style={[s.netValue, impact.net < 0 && { color: C.red }]}>
              {formatMoney(impact.net)}
            </Text>
          </View>
          <Text style={t.small}>
            Open rate from textmunication.com. Everything else is your estimate; log real results after you send.
          </Text>
        </View>
      ) : (
        <Text accessibilityRole="alert" style={ui.error}>
          {impactError}
        </Text>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      <Button
        title="Create this campaign"
        icon="arrow-right"
        onPress={() => {
          if (!impact) {
            setError("Fix the projection inputs before continuing.");
            return;
          }
          if (idea.valueKind && !(offerValue > 0)) {
            setError("Enter an offer value greater than zero.");
            return;
          }
          onCreate({
            name: idea.title,
            body: fullMessage,
            audience: ALL_SUBSCRIBERS,
            scheduledAt: sendTime.toISOString(),
            ideaId: idea.id,
            estimate,
          });
        }}
      />
      <Text style={[t.small, { textAlign: "center" }]}>
        Opens the campaign wizard with this message and send time filled in.
      </Text>
    </View>
  );
}

function ImpactStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <View style={s.impactStat}>
      <Text style={s.impactLabel}>{label}</Text>
      <Text style={s.impactValue}>{value}</Text>
      <Text style={t.small}>{caption}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
  },
  ideaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    backgroundColor: C.white,
  },
  ideaIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  ideaTitle: { color: C.ink, fontFamily: F.semibold, fontSize: 15, lineHeight: 21 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    alignSelf: "flex-start",
  },
  backText: { color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  preview: {
    gap: 6,
    padding: 14,
    borderRadius: R.lg,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewLabel: {
    color: C.faint,
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  previewText: { color: C.ink, fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  whyCard: {
    gap: 10,
    padding: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    backgroundColor: C.white,
  },
  whyLine: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  inputRow: { flexDirection: "row", gap: 10 },
  narrow: { width: 112 },
  impact: {
    gap: 10,
    padding: 14,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
  },
  impactRow: { flexDirection: "row", gap: 10 },
  impactStat: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: R.md,
    padding: 12,
    gap: 2,
  },
  impactLabel: { color: C.muted, fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  impactValue: { color: C.ink, fontFamily: F.bold, fontSize: 22, lineHeight: 28 },
  netRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  netLabel: { color: C.ink, fontFamily: F.semibold, fontSize: 15, lineHeight: 21 },
  netValue: { color: C.green, fontFamily: F.bold, fontSize: 24, lineHeight: 30 },
  pressed: { opacity: 0.7 },
});

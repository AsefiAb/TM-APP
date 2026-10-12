import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Campaign, getSmsInfo } from "./domain";
import { estimateImpact, formatMoney, getIdea } from "./ideas";
import { Badge, Button, C, F, Input, R, Sheet, t, ui } from "./ui";

function describeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatWhen(value?: string) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}

/** A sent campaign: what was projected, what actually happened, and reuse. */
export function CampaignResultsSheet({
  campaign,
  onClose,
  onSave,
  onUseAgain,
  onOpenReports,
}: {
  campaign?: Campaign;
  onClose: () => void;
  onSave: (input: { redemptions: number; revenue: number; note?: string }) => Promise<void>;
  onUseAgain: () => void;
  onOpenReports: () => void;
}) {
  return (
    <Sheet
      visible={!!campaign}
      title={campaign?.name ?? "Campaign"}
      subtitle={campaign?.sentAt ? `Sent ${formatWhen(campaign.sentAt)}` : "Sent campaign"}
      onClose={onClose}
      scrollKey={campaign?.id}
    >
      {campaign ? (
        <ResultsBody
          key={campaign.id}
          campaign={campaign}
          onSave={onSave}
          onUseAgain={onUseAgain}
          onOpenReports={onOpenReports}
        />
      ) : null}
    </Sheet>
  );
}

function ResultsBody({
  campaign,
  onSave,
  onUseAgain,
  onOpenReports,
}: {
  campaign: Campaign;
  onSave: (input: { redemptions: number; revenue: number; note?: string }) => Promise<void>;
  onUseAgain: () => void;
  onOpenReports: () => void;
}) {
  const [redemptions, setRedemptions] = useState(
    campaign.results ? String(campaign.results.redemptions) : "",
  );
  const [revenue, setRevenue] = useState(
    campaign.results ? String(campaign.results.revenue) : "",
  );
  const [note, setNote] = useState(campaign.results?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const idea = campaign.ideaId ? getIdea(campaign.ideaId) : undefined;
  const sms = getSmsInfo(campaign.body);
  let projected: ReturnType<typeof estimateImpact> | null = null;
  if (campaign.estimate) {
    try {
      projected = estimateImpact({
        recipients: campaign.recipients,
        segments: sms.segments,
        estimate: campaign.estimate,
      });
    } catch {
      projected = null;
    }
  }
  const actualRevenue = campaign.results?.revenue;
  const delta =
    projected && actualRevenue !== undefined ? actualRevenue - projected.revenue : undefined;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave({
        redemptions: Number(redemptions.trim()),
        revenue: Number(revenue.trim() || "0"),
        note,
      });
    } catch (caught) {
      setError(describeError(caught, "The results could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={ui.stack}>
      <View style={s.meta}>
        <Badge label="Sent" tone="green" />
        <Badge label={campaign.type ?? "SMS"} tone="gray" />
        {idea ? <Badge label={idea.title} tone="blue" /> : null}
      </View>
      <View style={s.message}>
        <Text style={s.messageText}>{campaign.body}</Text>
        <Text style={t.small}>
          {campaign.audience} · {campaign.recipients} recipient
          {campaign.recipients === 1 ? "" : "s"} · {sms.segments} segment
          {sms.segments === 1 ? "" : "s"} each
        </Text>
      </View>

      {projected ? (
        <View style={s.compare}>
          <Text style={t.h3}>Projected vs. actual</Text>
          <CompareRow
            label="Redemptions"
            projected={String(projected.redemptions)}
            actual={campaign.results ? String(campaign.results.redemptions) : undefined}
          />
          <CompareRow
            label="Revenue"
            projected={formatMoney(projected.revenue)}
            actual={campaign.results ? formatMoney(campaign.results.revenue) : undefined}
          />
          <CompareRow label="Message cost" projected={formatMoney(projected.messageCost)} />
          {delta !== undefined ? (
            <Text style={[t.bodyMedium, { color: delta >= 0 ? C.green : C.amber }]}>
              {delta >= 0
                ? `Beat the projection by ${formatMoney(delta)}.`
                : `${formatMoney(-delta)} under the projection. Try a different time, offer, or group next time.`}
            </Text>
          ) : (
            <Text style={t.small}>
              Log what happened to compare against the projection and learn what
              works for your customers.
            </Text>
          )}
        </View>
      ) : null}

      <Text style={t.h3}>{campaign.results ? "Update results" : "Log results"}</Text>
      <Text style={t.help}>
        Count redemptions from your register or bookings and enter the revenue
        they brought in. This stays on your device.
      </Text>
      <View style={s.inputRow}>
        <View style={ui.grow}>
          <Input
            label="Redemptions"
            required
            placeholder="0"
            value={redemptions}
            onChangeText={(value) => {
              setRedemptions(value);
              setError("");
            }}
            inputMode="numeric"
            maxLength={7}
          />
        </View>
        <View style={ui.grow}>
          <Input
            label="Revenue ($)"
            placeholder="0"
            value={revenue}
            onChangeText={(value) => {
              setRevenue(value);
              setError("");
            }}
            inputMode="decimal"
            maxLength={10}
          />
        </View>
      </View>
      <Input
        label="Notes (optional)"
        placeholder="What worked, what to change next time"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={280}
        style={s.note}
      />
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
      <Button
        title={saving ? "Saving…" : "Save results"}
        icon="check"
        disabled={saving}
        onPress={save}
      />
      {campaign.results ? (
        <Text style={[t.small, { textAlign: "center" }]}>
          Last logged {formatWhen(campaign.results.recordedAt)}
        </Text>
      ) : null}
      <View style={s.divider} />
      <Button title="Use again" icon="rotate-ccw" variant="outlinePrimary" onPress={onUseAgain} />
      <Button
        title="Delivery report in SAM"
        icon="external-link"
        variant="outline"
        onPress={onOpenReports}
      />
    </View>
  );
}

function CompareRow({
  label,
  projected,
  actual,
}: {
  label: string;
  projected: string;
  actual?: string;
}) {
  return (
    <View style={s.compareRow}>
      <Text style={[t.body, ui.grow]}>{label}</Text>
      <View style={s.compareCell}>
        <Text style={s.compareLabel}>Projected</Text>
        <Text style={s.compareValue}>{projected}</Text>
      </View>
      <View style={s.compareCell}>
        <Text style={s.compareLabel}>Actual</Text>
        <Text style={[s.compareValue, actual === undefined && { color: C.faint }]}>
          {actual ?? "—"}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  message: {
    gap: 8,
    padding: 14,
    borderRadius: R.lg,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  messageText: { color: C.ink, fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  compare: {
    gap: 10,
    padding: 14,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
  },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  compareCell: { width: 84, alignItems: "flex-end" },
  compareLabel: { color: C.muted, fontFamily: F.medium, fontSize: 11, lineHeight: 15 },
  compareValue: { color: C.ink, fontFamily: F.bold, fontSize: 16, lineHeight: 22 },
  inputRow: { flexDirection: "row", gap: 10 },
  note: { minHeight: 80 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
});

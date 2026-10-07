import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Badge, Button, C, Card, Icon, Section, Sheet, ui } from "./ui";

type BillingScreenProps = {
  onOpenBilling: () => void;
};

const sampleUsage = { used: 1240, allowance: 5000 };
const sampleUsagePercent = Math.round(
  (sampleUsage.used / sampleUsage.allowance) * 100,
);

/** Account billing remains in SAM AI until verified billing APIs are connected. */
export function BillingScreen({ onOpenBilling }: BillingScreenProps) {
  const [invoicePreview, setInvoicePreview] = useState(false);
  const [usageInfo, setUsageInfo] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 1180;

  return (
    <View style={s.screen}>
      <Card style={s.connectionCard}>
        <View style={s.connectionHeader}>
          <View style={s.iconTile}>
            <Icon name="credit-card" size={24} color={C.primary} />
          </View>
          <View style={ui.grow}>
            <Text accessibilityRole="header" style={ui.h2}>
              Your account, at a glance
            </Text>
            <Text style={[ui.help, s.subtitle]}>
              Plan, credits, and invoices in one place.
            </Text>
          </View>
        </View>
        <Badge label="Billing not connected" tone="gray" />
        <Text style={ui.body}>
          Your plan, renewal, and payment details will appear here after billing
          is connected. Open SAM AI to review your account settings.
        </Text>
        <View style={s.accountFacts}>
          <Fact label="Current plan" value="Available after connection" />
          <Fact label="Next renewal" value="Available after connection" />
          <Fact label="Amount due" value="Available after connection" last />
        </View>
        <View style={s.openAccount}>
          <Button
            title="Open SAM account settings"
            icon="external-link"
            onPress={onOpenBilling}
          />
          <Text style={[ui.help, s.accountHint]}>
            Opens your full SAM AI account.
          </Text>
        </View>
      </Card>

      <View style={[s.lowerCards, wide && s.lowerCardsWide]}>
        <Card style={s.lowerCard}>
          <View style={s.cardHeader}>
            <Text accessibilityRole="header" style={ui.h2}>
              Messaging credits
            </Text>
            <Badge label="Sample" tone="purple" />
          </View>
          <Text style={ui.help}>A preview of your monthly usage.</Text>
          <View style={s.usageNumbers}>
            <Text style={s.largeNumber}>1,240</Text>
            <Text style={s.allowance}>/ 5,000 credits</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Sample messaging credit usage"
            accessibilityValue={{
              min: 0,
              max: sampleUsage.allowance,
              now: sampleUsage.used,
              text: `${sampleUsagePercent}% of sample credits used`,
            }}
            style={s.usageTrack}
          >
            <View style={[s.usageFill, { width: `${sampleUsagePercent}%` }]} />
          </View>
          <View style={s.usageFooter}>
            <Text style={s.usageCaption}>{sampleUsagePercent}% used</Text>
            <Text style={s.usageRemaining}>3,760 remaining</Text>
          </View>
          <View style={s.sampleNote}>
            <Icon name="info" size={16} color={C.muted} />
            <Text style={[ui.help, ui.grow]}>
              Sample billing data. These are example credits, not your account
              balance or plan allowance.
            </Text>
          </View>
          <Button
            title="How credits work"
            variant="ghost"
            icon="help-circle"
            onPress={() => setUsageInfo(true)}
          />
        </Card>

        <Card style={s.lowerCard}>
          <Section title="Recent invoices" />
          <View style={s.invoiceEmpty}>
            <View style={s.invoiceIcon}>
              <Icon name="file-text" size={23} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>Your invoices will appear here</Text>
            <Text style={[ui.help, s.emptyText]}>
              Once billing is connected, review charges and payment status
              without searching through your account.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preview an example invoice. Illustrative amounts only."
            onPress={() => setInvoicePreview(true)}
            style={({ pressed }) => [s.exampleRow, pressed && s.pressed]}
          >
            <View style={ui.grow}>
              <Text style={s.exampleTitle}>Preview an invoice</Text>
              <Text style={ui.help}>See how the details will look</Text>
            </View>
            <Badge label="Example" tone="gray" />
            <Icon name="chevron-right" size={17} />
          </Pressable>
        </Card>
      </View>

      <Sheet
        visible={usageInfo}
        title="Understanding credits"
        subtitle="A quick guide to your usage"
        onClose={() => setUsageInfo(false)}
      >
        <View style={s.explainerRow}>
          <View style={s.smallIcon}>
            <Icon name="message-square" color={C.primary} />
          </View>
          <View style={ui.grow}>
            <Text style={s.explainerTitle}>See what you use</Text>
            <Text style={ui.body}>
              The usage bar shows credits used against your connected account’s
              allowance.
            </Text>
          </View>
        </View>
        <View style={s.explainerRow}>
          <View style={s.smallIcon}>
            <Icon name="file-text" color={C.primary} />
          </View>
          <View style={ui.grow}>
            <Text style={s.explainerTitle}>Check your plan for rates</Text>
            <Text style={ui.body}>
              Message length, format, destination, and your plan can affect
              credit usage. Your SAM AI account is the source for current rates
              and terms.
            </Text>
          </View>
        </View>
        <View style={s.sampleNote}>
          <Icon name="info" size={18} />
          <Text style={[ui.help, ui.grow]}>
            The 5,000-credit allowance shown here is an example for this
            preview, not a Textmunication plan offer.
          </Text>
        </View>
        <Button
          title="Open SAM account settings"
          icon="external-link"
          onPress={onOpenBilling}
        />
      </Sheet>

      <Sheet
        visible={invoicePreview}
        title="Invoice preview"
        subtitle="Example layout · not an actual invoice"
        onClose={() => setInvoicePreview(false)}
      >
        <View style={s.exampleNotice}>
          <Icon name="info" color={C.primary} size={20} />
          <Text style={[ui.help, ui.grow, { color: "#086CA8" }]}>
            All amounts below are illustrative. They are not Textmunication
            prices, your charges, or a request for payment.
          </Text>
        </View>
        <View style={s.invoiceSummary}>
          <View style={ui.grow}>
            <Text style={ui.eyebrow}>EXAMPLE-001</Text>
            <Text style={[ui.h2, s.subtitle]}>Example monthly invoice</Text>
          </View>
          <Badge label="Sample" tone="purple" />
        </View>
        <View style={s.invoiceLines}>
          <InvoiceLine label="Example messaging usage" amount="$20.00" />
          <InvoiceLine label="Example service charge" amount="$5.00" />
          <View style={s.invoiceTotal}>
            <Text style={s.explainerTitle}>Example total</Text>
            <Text style={s.invoiceAmount}>$25.00</Text>
          </View>
        </View>
        <Text style={ui.help}>
          Your real invoices, currency, taxes, payment status, and billing dates
          will come from your connected SAM AI account.
        </Text>
        <Button title="Done" onPress={() => setInvoicePreview(false)} />
      </Sheet>
    </View>
  );
}

function Fact({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.fact, !last && s.factBorder]}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{value}</Text>
    </View>
  );
}

function InvoiceLine({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={s.invoiceLine}>
      <Text style={[ui.body, ui.grow]}>{label}</Text>
      <Text style={ui.body}>{amount}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { gap: 20 },
  connectionCard: { gap: 18 },
  connectionHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lilac,
  },
  subtitle: { marginTop: 4 },
  accountFacts: {
    backgroundColor: C.bg,
    borderRadius: 15,
    paddingHorizontal: 16,
  },
  fact: { paddingVertical: 15, gap: 5 },
  factBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  factLabel: { color: C.ink, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  factValue: { color: C.muted, fontSize: 14, lineHeight: 21 },
  openAccount: { gap: 8, maxWidth: 330, width: "100%" },
  accountHint: { textAlign: "center" },
  lowerCards: { gap: 20 },
  lowerCardsWide: { flexDirection: "row", alignItems: "stretch" },
  lowerCard: { flex: 1, gap: 14 },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  usageNumbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "baseline",
    marginTop: 10,
  },
  largeNumber: {
    color: C.ink,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -1,
  },
  allowance: { color: C.muted, fontSize: 14, lineHeight: 21 },
  usageTrack: {
    height: 9,
    backgroundColor: C.lilac,
    borderRadius: 5,
    overflow: "hidden",
  },
  usageFill: { height: "100%", backgroundColor: C.primary, borderRadius: 5 },
  usageFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  usageCaption: { color: C.muted, fontSize: 14, lineHeight: 21 },
  usageRemaining: {
    color: C.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  sampleNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingTop: 6,
  },
  invoiceEmpty: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
    gap: 10,
  },
  invoiceIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lilac,
  },
  emptyTitle: {
    color: C.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: { textAlign: "center", maxWidth: 360 },
  exampleRow: {
    minHeight: 70,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  exampleTitle: {
    color: C.primary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  explainerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  smallIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lilac,
  },
  explainerTitle: {
    color: C.ink,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    marginBottom: 4,
  },
  exampleNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 15,
    borderRadius: 14,
    backgroundColor: C.lilac,
  },
  invoiceSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  invoiceLines: { gap: 16 },
  invoiceLine: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  invoiceTotal: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  invoiceAmount: {
    color: C.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "700",
  },
});

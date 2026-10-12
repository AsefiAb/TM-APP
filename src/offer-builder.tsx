import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildOfferMessage, getOfferExample, type OfferDraft } from "./offers";
import { withOptOut } from "./sam";
import { Badge, Button, C, Chips, F, Icon, Input, ui } from "./ui";

type OfferBuilderProps = {
  draft: OfferDraft;
  onChange: (draft: OfferDraft) => void;
  onUseMessage: (message: string) => void;
  hasMessage: boolean;
  customerMode?: boolean;
};

const examples: { kind: OfferDraft["kind"]; label: string }[] = [
  { kind: "percent", label: "20% off" },
  { kind: "amount", label: "$10 off" },
  { kind: "custom", label: "Free add-on" },
];
const kindLabels: Record<OfferDraft["kind"], string> = {
  percent: "Percent off",
  amount: "Amount off",
  custom: "Something else",
};

/** A controlled message-writing form. It does not create a checkout discount. */
export function OfferBuilder({
  draft,
  onChange,
  onUseMessage,
  hasMessage,
  customerMode = false,
}: OfferBuilderProps) {
  const [attempted, setAttempted] = useState(false);
  const [exampleNotice, setExampleNotice] = useState("");
  const [repeatHelpOpen, setRepeatHelpOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<
    "ready" | "valid" | "used" | "rejected"
  >("ready");
  const online = draft.redemptionMethod === "online";

  let message = "";
  let validationError = "";
  try {
    message = buildOfferMessage(draft);
  } catch (error) {
    validationError =
      error instanceof Error
        ? error.message
        : "Check the offer details and try again.";
  }

  function change(patch: Partial<OfferDraft>) {
    // Changed offer or checkout details must be confirmed again before use.
    onChange({ ...draft, checkoutReady: false, ...patch });
    setExampleNotice("");
    setAttempted(false);
  }

  function useMessage() {
    setAttempted(true);
    try {
      onUseMessage(buildOfferMessage(draft));
    } catch {
      // The same validation is shown inline; no message is replaced on failure.
    }
  }

  return (
    <View style={s.root}>
      <View style={s.intro}>
        <View style={s.introIcon}>
          <Icon name="tag" size={22} color={C.primary} />
        </View>
        <View style={ui.grow}>
          <Text style={s.title}>Turn an offer into a message</Text>
          <Text style={ui.help}>
            A few details, written clearly for your customers.
          </Text>
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Start with an example</Text>
        <View style={s.exampleOptions}>
          {examples.map((example) => (
            <Pressable
              key={example.kind}
              accessibilityRole="button"
              accessibilityLabel={`Fill offer fields with the ${example.label} example`}
              onPress={() => {
                onChange({
                  ...draft,
                  ...getOfferExample(example.kind),
                  checkoutReady: false,
                });
                setExampleNotice(
                  `${example.label} example added. Change the details to fit your business.`,
                );
                setAttempted(false);
              }}
              style={({ pressed }) => [s.exampleChip, pressed && s.pressed]}
            >
              <Text style={s.exampleChipText}>{example.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={ui.help}>
          Examples fill the fields below. Review them before using the message.
        </Text>
        {exampleNotice ? (
          <Text accessibilityLiveRegion="polite" style={s.notice}>
            {exampleNotice}
          </Text>
        ) : null}
      </View>

      <Input
        label="Business name"
        placeholder="e.g. Oak Street Coffee"
        value={draft.businessName}
        onChangeText={(businessName) => change({ businessName })}
        maxLength={80}
      />

      <View style={s.fieldGroup}>
        <Text style={s.label}>What are you offering?</Text>
        <Chips
          options={Object.values(kindLabels)}
          value={kindLabels[draft.kind]}
          onChange={(label) => {
            const kind = examples.find(
              (example) => kindLabels[example.kind] === label,
            )?.kind;
            if (kind && kind !== draft.kind) change({ kind, value: "" });
          }}
        />
        <Input
          label={
            draft.kind === "percent"
              ? "Percentage off"
              : draft.kind === "amount"
                ? "Dollars off"
                : "The benefit"
          }
          placeholder={
            draft.kind === "percent"
              ? "e.g. 20"
              : draft.kind === "amount"
                ? "e.g. 10"
                : "e.g. A free add-on"
          }
          value={draft.value}
          onChangeText={(value) => change({ value })}
          maxLength={draft.kind === "custom" ? 160 : 12}
          inputMode={draft.kind === "custom" ? "text" : "decimal"}
        />
      </View>

      <Input
        label="What does it apply to?"
        placeholder="e.g. your next coffee order"
        value={draft.appliesTo}
        onChangeText={(appliesTo) => change({ appliesTo })}
        maxLength={180}
      />
      <View style={s.fieldGroup}>
        <Input
          label="Use by date (MM/DD/YYYY)"
          placeholder="e.g. 10/31/2026"
          value={draft.expiresOn}
          onChangeText={(expiresOn) => change({ expiresOn })}
          maxLength={10}
        />
        <Text style={ui.help}>
          Choose the last day customers can use this offer. The end date uses
          your device’s local time.
        </Text>
      </View>
      <Input
        label="Any conditions? (optional)"
        placeholder="e.g. One per customer. Minimum purchase $20."
        value={draft.terms}
        onChangeText={(terms) => change({ terms })}
        maxLength={500}
        multiline
        style={s.termsInput}
      />

      <View style={s.redemptionCard}>
        <View style={s.redemptionHeader}>
          <Icon name={online ? "shopping-bag" : "map-pin"} color={C.primary} />
          <Text style={[s.label, ui.grow]}>
            {online ? "Use an online checkout" : "Redeem in person"}
          </Text>
          {!online ? <Badge label="Simple start" tone="purple" /> : null}
        </View>
        {!online ? (
          <>
            <Text style={ui.body}>
              Your team checks the customer against your own offer records, then
              applies the discount in the register.
            </Text>
            <Text style={ui.help}>
              A screenshot alone is not proof of eligibility or an unused offer.
            </Text>
            <Text style={ui.help}>
              This creates message wording only. It does not create a discount
              in your register or track redemption.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use an online checkout instead"
              accessibilityState={{ expanded: false }}
              onPress={() => change({ redemptionMethod: "online" })}
              style={({ pressed }) => [s.linkButton, pressed && s.pressed]}
            >
              <Text style={s.linkText}>Use an online checkout instead</Text>
              <Icon name="chevron-down" size={17} color={C.primary} />
            </Pressable>
          </>
        ) : (
          <>
            <Text style={ui.body}>
              First create the discount in your checkout system. Then add the
              code and link you have already tested.
            </Text>
            <Input
              label="Existing checkout code"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. FALL20"
              value={draft.checkoutCode}
              onChangeText={(checkoutCode) => change({ checkoutCode })}
              maxLength={32}
            />
            <Input
              label="Checkout link (https://)"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://your-business.com/shop"
              value={draft.checkoutUrl}
              onChangeText={(checkoutUrl) => change({ checkoutUrl })}
              maxLength={300}
              inputMode="url"
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="I created and tested this discount in my checkout system"
              accessibilityState={{ checked: draft.checkoutReady }}
              onPress={() => change({ checkoutReady: !draft.checkoutReady })}
              style={({ pressed }) => [s.confirmation, pressed && s.pressed]}
            >
              <View style={[s.checkbox, draft.checkoutReady && s.checked]}>
                {draft.checkoutReady ? (
                  <Icon name="check" size={15} color={C.white} />
                ) : null}
              </View>
              <Text style={[ui.body, ui.grow]}>
                I created and tested this discount in my checkout system.
              </Text>
            </Pressable>
            <Text style={ui.help}>
              SAM does not create or validate this checkout discount. Your
              checkout system controls its rules and usage limits.
            </Text>
            <Button
              title="Use in-person redemption instead"
              icon="map-pin"
              variant="ghost"
              onPress={() => change({ redemptionMethod: "in-person" })}
            />
          </>
        )}
      </View>

      {attempted && validationError ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {validationError}
        </Text>
      ) : null}
      <View style={s.preview}>
        <View style={ui.row}>
          <Icon name="message-square" size={18} color={C.primary} />
          <Text style={[s.label, ui.grow]}>
            {customerMode ? "Customer message" : "Customer message preview"}
          </Text>
        </View>
        {message ? (
          <Text style={ui.body}>{withOptOut(message)}</Text>
        ) : (
          <Text style={ui.help}>
            {online
              ? "Add your offer details and confirm your checkout code to see the wording here. Nothing is sent."
              : "Add your business, offer, and date to see the wording here. Nothing is sent."}
          </Text>
        )}
      </View>
      <Button
        title={hasMessage ? "Replace current message" : "Use this message"}
        icon="arrow-down"
        onPress={useMessage}
      />
      <Text style={[ui.help, s.center]}>
        {hasMessage
          ? "Replaces the text in your campaign editor. Review it before saving."
          : "Adds this wording to your campaign editor. Review it before saving."}
      </Text>

      <View style={s.helpCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How do we prevent repeat use?"
          accessibilityState={{ expanded: repeatHelpOpen }}
          onPress={() => setRepeatHelpOpen(!repeatHelpOpen)}
          style={({ pressed }) => [s.helpToggle, pressed && s.pressed]}
        >
          <Icon name="shield" size={20} color={C.primary} />
          <Text style={[s.label, ui.grow]}>How do we prevent repeat use?</Text>
          <Icon
            name={repeatHelpOpen ? "chevron-up" : "chevron-down"}
            size={18}
          />
        </Pressable>
        {repeatHelpOpen ? (
          <View style={s.helpContent}>
            <Text style={ui.body}>
              A personal-coupon flow gives each customer a separate code and
              keeps a shared redemption record. Staff check the assigned
              customer and mark it used at redemption.
            </Text>
            <Text style={ui.help}>
              A shared promo code or “one per customer” wording alone does not
              enforce this. An unused code can be forwarded, so staff still need
              to verify the customer and offer conditions.
            </Text>
            {!customerMode && (
              <View style={s.demoCard}>
                <Badge label="Example only—no real coupon" tone="amber" />
                <Text style={s.demoCode}>DEMO-7Q2K</Text>
                <Text style={ui.help}>Assigned to one fictional customer.</Text>
                <View accessibilityLiveRegion="polite" style={s.demoStatus}>
                  <Icon
                    name={
                      demoStep === "rejected"
                        ? "x-circle"
                        : demoStep === "used"
                          ? "check-circle"
                          : "tag"
                    }
                    color={demoStep === "rejected" ? "#AC314F" : C.primary}
                    size={20}
                  />
                  <Text style={[s.label, ui.grow]}>
                    {demoStep === "ready"
                      ? "Ready to check (demo)"
                      : demoStep === "valid"
                        ? "Valid (demo)"
                        : demoStep === "used"
                          ? "Used (demo)"
                          : "Already used (demo)"}
                  </Text>
                </View>
                {demoStep === "ready" ? (
                  <Button
                    title="Check example"
                    variant="secondary"
                    onPress={() => setDemoStep("valid")}
                  />
                ) : null}
                {demoStep === "valid" ? (
                  <>
                    <Text style={ui.help}>
                      In a real system, staff would verify the customer before
                      confirming redemption.
                    </Text>
                    <Button
                      title="Confirm example redemption"
                      onPress={() => setDemoStep("used")}
                    />
                  </>
                ) : null}
                {demoStep === "used" ? (
                  <Button
                    title="Check same code again"
                    variant="secondary"
                    onPress={() => setDemoStep("rejected")}
                  />
                ) : null}
                {demoStep === "rejected" ? (
                  <Text style={ui.help}>
                    The example redemption record blocks a second use. A real
                    service must enforce this across every device.
                  </Text>
                ) : null}
                {demoStep !== "ready" ? (
                  <Button
                    title="Restart walkthrough"
                    variant="ghost"
                    icon="rotate-ccw"
                    onPress={() => setDemoStep("ready")}
                  />
                ) : null}
              </View>
            )}
            <Text style={ui.help}>
              {customerMode
                ? "Your checkout system must track redemptions and verify customers. Writing an offer here does not create a redeemable coupon."
                : "This walkthrough runs on your device only. Real coupon validation, customer checks, and redemption records are not connected."}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 18 },
  intro: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  introIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: C.ink,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: F.bold,
    marginBottom: 4,
  },
  label: { color: C.ink, fontSize: 14, lineHeight: 21, fontFamily: F.semibold },
  fieldGroup: { gap: 9 },
  exampleOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  exampleChip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#C8E1F0",
    borderRadius: 11,
    backgroundColor: C.lilac,
    justifyContent: "center",
  },
  exampleChipText: {
    color: C.primaryDark,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: F.semibold,
  },
  notice: { color: C.green, fontSize: 14, lineHeight: 21 },
  termsInput: { minHeight: 88 },
  redemptionCard: {
    padding: 15,
    gap: 13,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.white,
  },
  redemptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  linkButton: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  linkText: {
    color: C.primary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: F.semibold,
    flex: 1,
  },
  confirmation: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: C.muted,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: C.primary, borderColor: C.primary },
  preview: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: C.lilac },
  center: { textAlign: "center" },
  helpCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  helpToggle: {
    minHeight: 58,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  helpContent: { padding: 15, paddingTop: 0, gap: 14 },
  demoCard: { padding: 15, gap: 12, backgroundColor: C.bg, borderRadius: 13 },
  demoCode: {
    color: C.ink,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: F.bold,
    letterSpacing: 1.4,
  },
  demoStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.7 },
});

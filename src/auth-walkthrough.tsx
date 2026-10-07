import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Brand, Button, C, Icon, IconName } from "./ui";

export type AuthPreviewPath = "signup" | "signin";
type PreviewStep = "signup" | "verify" | "business" | "signin" | "reset";

/** A local walkthrough. These display rows never collect or submit credentials. */
export function AuthWalkthrough({
  initialPath,
  onBack,
  onEnterDemo,
}: {
  initialPath: AuthPreviewPath;
  onBack: () => void;
  onEnterDemo: () => void;
}) {
  const [step, setStep] = useState<PreviewStep>(initialPath);
  const signup = step === "signup" || step === "verify" || step === "business";
  const position = step === "business" ? 3 : step === "verify" ? 2 : 1;

  function goTo(next: PreviewStep) {
    setStep(next);
  }

  const copy: Record<PreviewStep, { title: string; detail: string }> = {
    signup: {
      title: "Create account",
      detail: "Try it with these sample details.",
    },
    verify: {
      title: "Check your email",
      detail: "A preview of the email confirmation step.",
    },
    business: {
      title: "Set up your business",
      detail: "A sample business to explore.",
    },
    signin: {
      title: "Welcome back",
      detail: "Continue with the sample account.",
    },
    reset: {
      title: "Reset password",
      detail: "Preview how an owner gets back in.",
    },
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView key={step} contentContainerStyle={s.scroll}>
        <View style={s.frame}>
          <View style={s.topBar}>
            <Brand compact />
            <Badge label="Interactive preview" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            onPress={onBack}
            style={({ pressed }) => [s.back, pressed && s.pressed]}
          >
            <Icon name="arrow-left" size={16} color={C.primary} />
            <Text style={s.linkText}>Back to welcome</Text>
          </Pressable>

          <View style={s.card}>
            {signup ? (
              <View
                style={s.progress}
                accessibilityLabel={`Sign up preview, step ${position} of 3`}
              >
                {["Account", "Email", "Business"].map((label, index) => (
                  <View key={label} style={s.progressItem}>
                    <View
                      style={[
                        s.progressBar,
                        index < position && s.progressBarActive,
                      ]}
                    />
                    <Text
                      style={[
                        s.progressLabel,
                        index === position - 1 && s.progressLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={s.heading}>
              <Text accessibilityRole="header" style={s.title}>
                {copy[step].title}
              </Text>
              <Text style={s.description}>{copy[step].detail}</Text>
            </View>

            {step === "signup" || step === "signin" ? (
              <>
                <View style={s.sampleLabel}>
                  <Icon name="eye" size={14} color={C.muted} />
                  <Text style={s.note}>Sample details · read only</Text>
                </View>
                <View style={s.fields}>
                  {step === "signup" ? (
                    <SampleRow
                      label="Full name"
                      value="Alex Morgan"
                      icon="user"
                    />
                  ) : null}
                  <SampleRow
                    label="Email address"
                    value="owner@example.com"
                    icon="mail"
                  />
                  <SampleRow
                    label="Password"
                    value="••••••••••••"
                    icon="lock"
                    masked
                  />
                </View>
                {step === "signin" ? (
                  <TextLink
                    title="Preview forgot password"
                    onPress={() => goTo("reset")}
                  />
                ) : null}
                <Button
                  title={
                    step === "signup"
                      ? "Continue preview"
                      : "Continue with sample account"
                  }
                  icon="arrow-right"
                  onPress={
                    step === "signup" ? () => goTo("verify") : onEnterDemo
                  }
                />
                <Text style={s.footnote}>
                  Sample only. No account or password is created.
                </Text>
                <View style={s.divider} />
                <TextLink
                  title={
                    step === "signup"
                      ? "Preview sign in instead"
                      : "Preview sign up instead"
                  }
                  onPress={() => goTo(step === "signup" ? "signin" : "signup")}
                />
              </>
            ) : null}

            {step === "verify" ? (
              <>
                <SampleRow
                  label="Sample email address"
                  value="owner@example.com"
                  icon="mail"
                />
                <View style={s.explanation}>
                  <Text style={s.description}>
                    In this proposed flow, you confirm your email. No email was
                    sent in this preview.
                  </Text>
                </View>
                <Button
                  title="Use demo verification"
                  icon="check"
                  onPress={() => goTo("business")}
                />
                <TextLink
                  title="Back to sample account"
                  onPress={() => goTo("signup")}
                />
              </>
            ) : null}

            {step === "business" ? (
              <>
                <View style={s.sampleLabel}>
                  <Icon name="eye" size={14} color={C.muted} />
                  <Text style={s.note}>Sample business · read only</Text>
                </View>
                <View style={s.fields}>
                  <SampleRow
                    label="Business name"
                    value="Your business"
                    icon="briefcase"
                  />
                  <SampleRow
                    label="Business type"
                    value="Restaurant & café"
                    icon="coffee"
                  />
                </View>
                <Text style={s.description}>
                  Campaigns, inbox and billing, ready to explore.
                </Text>
                <Button
                  title="Open demo workspace"
                  icon="arrow-right"
                  onPress={onEnterDemo}
                />
                <Text style={s.footnote}>
                  Opens sample data. No business account is connected.
                </Text>
                <TextLink
                  title="Back to email preview"
                  onPress={() => goTo("verify")}
                />
              </>
            ) : null}

            {step === "reset" ? (
              <>
                <SampleRow
                  label="Sample email address"
                  value="owner@example.com"
                  icon="mail"
                />
                <View style={s.explanation}>
                  <Text style={s.description}>
                    The proposed flow uses an emailed reset link. This preview
                    has not sent an email or changed a password.
                  </Text>
                </View>
                <Button
                  title="Back to sign-in preview"
                  icon="arrow-left"
                  onPress={() => goTo("signin")}
                />
              </>
            ) : null}
          </View>

          <Text style={s.footer}>
            SAM AI by Textmunication · Sample journey
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SampleRow({
  label,
  value,
  icon,
  masked = false,
}: {
  label: string;
  value: string;
  icon: IconName;
  masked?: boolean;
}) {
  return (
    <View
      style={s.field}
      accessible
      accessibilityLabel={`${label}: ${masked ? "sample password hidden" : value}. Read only.`}
    >
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldValue}>
        <Icon name={icon} size={17} />
        <Text style={[s.value, masked && s.masked]}>{value}</Text>
      </View>
    </View>
  );
}

function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.textLink, pressed && s.pressed]}
    >
      <Text style={[s.linkText, s.linkCentered]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },
  frame: { width: "100%", maxWidth: 480, alignSelf: "center" },
  topBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    backgroundColor: C.white,
    gap: 14,
  },
  progress: { flexDirection: "row", gap: 8, marginBottom: 2 },
  progressItem: { flex: 1, gap: 7 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: C.border },
  progressBarActive: { backgroundColor: C.primary },
  progressLabel: { fontSize: 11, lineHeight: 16, color: C.muted },
  progressLabelActive: { color: C.primary, fontWeight: "700" },
  heading: { gap: 6 },
  title: {
    color: C.ink,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  description: { color: C.muted, fontSize: 14, lineHeight: 22 },
  sampleLabel: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    marginBottom: -7,
  },
  note: { color: C.muted, fontSize: 12, lineHeight: 18 },
  fields: { gap: 14 },
  field: { gap: 7 },
  fieldLabel: { color: C.ink, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  fieldValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.bg,
  },
  value: { color: C.ink, fontSize: 14, lineHeight: 22, flex: 1, flexShrink: 1 },
  masked: { letterSpacing: 2 },
  linkText: {
    color: C.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  textLink: { minHeight: 44, justifyContent: "center", paddingVertical: 7 },
  linkCentered: { textAlign: "center" },
  footnote: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -7,
  },
  explanation: {
    backgroundColor: C.lilac,
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  divider: { height: 1, backgroundColor: C.border },
  pressed: { opacity: 0.65 },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    textAlign: "center",
    marginTop: 22,
  },
});

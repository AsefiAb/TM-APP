import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Button, C, Icon, ui } from "./ui";

export type AuthPath = "signup" | "signin";
type AuthStep = AuthPath | "business" | "reset";

/** UI walkthrough only. No credential is stored, transmitted, or authenticated. */
export function AuthWalkthrough({
  initialPath,
  onBack,
  onEnterDemo,
  onCompleteSetup,
}: {
  initialPath: AuthPath;
  onBack: () => void;
  onEnterDemo: () => void;
  onCompleteSetup: (name: string) => void;
}) {
  const [step, setStep] = useState<AuthStep>(initialPath);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Restaurant & café");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const signup = step === "signup" || step === "business";
  const position = step === "business" ? 2 : 1;

  function goTo(next: AuthStep) {
    setError("");
    setStep(next);
  }

  async function openReset() {
    setError("");
    setOpening(true);
    try {
      await Linking.openURL("https://sam3.txhd.io/");
    } catch {
      setError("SAM could not open. Try again, or visit sam3.txhd.io.");
    } finally {
      setOpening(false);
    }
  }

  const copy: Record<AuthStep, { title: string; detail: string }> = {
    signup: {
      title: "Create account",
      detail: "A little about you. Then, your business.",
    },
    business: {
      title: "Your business",
      detail: "Make this workspace your own.",
    },
    signin: {
      title: "Welcome back",
      detail: "Your business, right where you left it.",
    },
    reset: {
      title: "Reset password",
      detail: "Open SAM and choose Forgot password to reset your password.",
    },
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        key={step}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.frame}>
          <Brand compact />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            onPress={onBack}
            style={({ pressed }) => [s.back, pressed && s.pressed]}
          >
            <Icon name="arrow-left" size={16} color={C.primary} />
            <Text style={s.linkText}>Back</Text>
          </Pressable>
          <View style={s.card}>
            {signup ? (
              <View
                style={s.progress}
                accessibilityLabel={`Create account, step ${position} of 2`}
              >
                {["Account", "Business"].map((label, index) => (
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
              <CredentialsForm
                key={step}
                path={step}
                onContinue={
                  step === "signup" ? () => goTo("business") : onEnterDemo
                }
                onSwitch={() => goTo(step === "signup" ? "signin" : "signup")}
                onReset={() => goTo("reset")}
              />
            ) : null}

            {step === "business" ? (
              <>
                <Field
                  label="Business name"
                  placeholder="Your business name"
                  value={businessName}
                  onChangeText={(value) => {
                    setBusinessName(value);
                    setError("");
                  }}
                  autoCapitalize="words"
                  maxLength={80}
                />
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Business type</Text>
                  <View style={s.choices}>
                    {["Restaurant & café", "Retail & services", "Other"].map(
                      (label) => (
                        <Pressable
                          key={label}
                          accessibilityRole="radio"
                          accessibilityLabel={label}
                          accessibilityState={{
                            checked: businessType === label,
                          }}
                          onPress={() => setBusinessType(label)}
                          style={({ pressed }) => [
                            s.choice,
                            businessType === label && s.choiceSelected,
                            pressed && s.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              s.choiceText,
                              businessType === label && s.choiceTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                          {businessType === label ? (
                            <Icon name="check" size={16} color={C.primary} />
                          ) : null}
                        </Pressable>
                      ),
                    )}
                  </View>
                </View>
                {error ? <FormError message={error} /> : null}
                <Button
                  title="Open workspace"
                  icon="arrow-right"
                  onPress={() => {
                    if (!businessName.trim()) {
                      setError("Add your business name to continue.");
                      return;
                    }
                    onCompleteSetup(businessName);
                  }}
                />
                <TextLink
                  title="Back to account"
                  onPress={() => goTo("signup")}
                />
              </>
            ) : null}

            {step === "reset" ? (
              <>
                {error ? <FormError message={error} /> : null}
                <Button
                  title={opening ? "Opening SAM…" : "Reset on SAM"}
                  icon="external-link"
                  disabled={opening}
                  onPress={openReset}
                />
                <TextLink
                  title="Back to sign in"
                  onPress={() => goTo("signin")}
                />
              </>
            ) : null}
          </View>
          <Text style={s.footer}>SAM AI by Textmunication</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Password state belongs only to this form and is discarded on unmount. */
function CredentialsForm({
  path,
  onContinue,
  onSwitch,
  onReset,
}: {
  path: AuthPath;
  onContinue: () => void;
  onSwitch: () => void;
  onReset: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function leave(action: () => void) {
    setPassword("");
    action();
  }

  function continueForm() {
    if (path === "signup" && !fullName.trim()) {
      setError("Add your name to continue.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
    } else if (!password.trim()) {
      setError("Enter a password to continue.");
    } else {
      leave(onContinue);
    }
  }

  return (
    <View style={s.fields}>
      {path === "signup" ? (
        <Field
          label="Full name"
          placeholder="Your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          maxLength={100}
        />
      ) : null}
      <Field
        label="Email address"
        placeholder="you@business.com"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        autoCapitalize="none"
        maxLength={254}
      />
      <Field
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        importantForAutofill="noExcludeDescendants"
        textContentType="none"
        maxLength={256}
        onSubmitEditing={continueForm}
      />
      {path === "signin" ? (
        <TextLink title="Forgot password?" onPress={() => leave(onReset)} />
      ) : null}
      {error ? <FormError message={error} /> : null}
      <Button title="Continue" icon="arrow-right" onPress={continueForm} />
      <TextLink
        title={
          path === "signup"
            ? "Already have an account? Sign in"
            : "New to SAM? Create account"
        }
        onPress={() => leave(onSwitch)}
      />
    </View>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoComplete="off"
        autoCorrect={false}
        placeholderTextColor={C.muted}
        style={s.input}
      />
    </View>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={ui.error}
    >
      {message}
    </Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 22 },
  frame: { width: "100%", maxWidth: 420, alignSelf: "center" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 6,
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    backgroundColor: C.white,
    gap: 18,
  },
  progress: { flexDirection: "row", gap: 8 },
  progressItem: { flex: 1, gap: 7 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: C.border },
  progressBarActive: { backgroundColor: C.primary },
  progressLabel: { fontSize: 11, lineHeight: 16, color: C.muted },
  progressLabelActive: { color: C.primary, fontWeight: "700" },
  heading: { gap: 6 },
  title: {
    color: C.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  description: { color: C.muted, fontSize: 14, lineHeight: 21 },
  fields: { gap: 14 },
  field: { gap: 7 },
  fieldLabel: { color: C.ink, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.bg,
    color: C.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  choices: { gap: 8 },
  choice: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  choiceSelected: { borderColor: C.primary, backgroundColor: C.lilac },
  choiceText: { color: C.muted, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  choiceTextSelected: { color: C.primary, fontWeight: "600" },
  linkText: {
    color: C.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  textLink: { minHeight: 44, justifyContent: "center", paddingVertical: 7 },
  linkCentered: { textAlign: "center" },
  pressed: { opacity: 0.65 },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    textAlign: "center",
    marginTop: 22,
  },
});

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
import { Business } from "./access";
import { SamLogo } from "./brand";
import { Button, C, Checkbox, F, Icon, Input, R, t } from "./ui";

export type AuthPath = "signup" | "signin";
type AuthStep = AuthPath | "business" | "reset";

export const INDUSTRIES = [
  "Restaurant",
  "Retail",
  "Health & Fitness",
  "Salon/Spa",
  "Automotive",
  "Real Estate",
  "Non-Profit",
  "Other",
];

const SAM_URL = "https://sam3.txhd.io/";
const TERMS_URL = "https://www.textmunication.com/terms-of-service";
const PRIVACY_URL = "https://www.textmunication.com/privacy-policy";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account entry screens styled after the SAM 3.0 sign-in and registration
 * pages. Credentials stay in component state and are discarded on unmount;
 * this version does not authenticate against SAM.
 */
export function AuthWalkthrough({
  initialPath,
  onBack,
  onSignIn,
  onCompleteSetup,
}: {
  initialPath: AuthPath;
  onBack: () => void;
  onSignIn: (email: string) => void;
  onCompleteSetup: (email: string, business: Business) => void;
}) {
  const [step, setStep] = useState<AuthStep>(initialPath);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("Restaurant");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  function goTo(next: AuthStep) {
    setError("");
    setStep(next);
  }

  async function open(url: string) {
    setError("");
    setOpening(true);
    try {
      await Linking.openURL(url);
    } catch {
      setError("SAM could not open. Try again, or visit sam3.txhd.io.");
    } finally {
      setOpening(false);
    }
  }

  const copy: Record<AuthStep, { title: string; detail: string }> = {
    signin: { title: "Welcome Back", detail: "Sign in to your SAM account" },
    signup: {
      title: "Create your SAM account!",
      detail: "Get started with the most powerful text marketing platform.",
    },
    business: {
      title: "Your business",
      detail: "The name that appears in your messages and on your dashboard.",
    },
    reset: {
      title: "Forgot password?",
      detail:
        "Password resets happen on the SAM website. Open SAM, choose Forgot password, and follow the emailed link.",
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            onPress={onBack}
            style={({ pressed }) => [s.back, pressed && s.pressed]}
          >
            <Icon name="arrow-left" size={17} color={C.text} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <View style={s.logo}>
            <SamLogo height={40} />
          </View>

          <View style={s.card}>
            {step === "signup" || step === "business" ? (
              <View
                style={s.progress}
                accessibilityLabel={`Create account, step ${step === "business" ? 2 : 1} of 2`}
              >
                {["Account", "Business"].map((label, index) => {
                  const position = step === "business" ? 2 : 1;
                  return (
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
                  );
                })}
              </View>
            ) : null}

            <View style={s.heading}>
              <Text accessibilityRole="header" style={s.title}>
                {copy[step].title}
              </Text>
              <Text style={s.description}>{copy[step].detail}</Text>
            </View>

            {step === "signin" || step === "signup" ? (
              <CredentialsForm
                key={step}
                path={step}
                email={email}
                onEmailChange={setEmail}
                onContinue={() =>
                  step === "signup" ? goTo("business") : onSignIn(email)
                }
                onSwitch={() => goTo(step === "signup" ? "signin" : "signup")}
                onReset={() => goTo("reset")}
              />
            ) : null}

            {step === "business" ? (
              <View style={s.fields}>
                <Input
                  label="Business Name"
                  required
                  placeholder="e.g. Oak Street Coffee"
                  value={businessName}
                  onChangeText={(value) => {
                    setBusinessName(value);
                    setError("");
                  }}
                  autoCapitalize="words"
                  maxLength={80}
                  help="Appears in disclaimers and welcome messages."
                />
                <View style={s.field}>
                  <Text style={t.label}>Industry</Text>
                  <View style={s.choices}>
                    {INDUSTRIES.map((label) => (
                      <Pressable
                        key={label}
                        accessibilityRole="radio"
                        accessibilityLabel={label}
                        accessibilityState={{ checked: industry === label }}
                        onPress={() => setIndustry(label)}
                        style={({ pressed }) => [
                          s.choice,
                          industry === label && s.choiceSelected,
                          pressed && s.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            s.choiceText,
                            industry === label && s.choiceTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
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
                    onCompleteSetup(email, { name: businessName, industry });
                  }}
                />
                <TextLink title="Back to account" onPress={() => goTo("signup")} />
              </View>
            ) : null}

            {step === "reset" ? (
              <View style={s.fields}>
                {error ? <FormError message={error} /> : null}
                <Button
                  title={opening ? "Opening SAM…" : "Open SAM to reset"}
                  icon="external-link"
                  disabled={opening}
                  onPress={() => open(SAM_URL)}
                />
                <TextLink title="Back to sign in" onPress={() => goTo("signin")} />
              </View>
            ) : null}
          </View>

          <Text style={s.legal}>
            By continuing, you acknowledge and accept Textmunication{" "}
            <Text style={s.legalLink} onPress={() => open(TERMS_URL)}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={s.legalLink} onPress={() => open(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Password state belongs only to this form and is discarded on unmount. */
function CredentialsForm({
  path,
  email,
  onEmailChange,
  onContinue,
  onSwitch,
  onReset,
}: {
  path: AuthPath;
  email: string;
  onEmailChange: (value: string) => void;
  onContinue: () => void;
  onSwitch: () => void;
  onReset: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  function leave(action: () => void) {
    setPassword("");
    setConfirm("");
    action();
  }

  function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
    } else if (!password) {
      setError("Enter your password.");
    } else if (path === "signup" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
    } else if (path === "signup" && confirm !== password) {
      setError("Passwords do not match.");
    } else {
      setError("");
      leave(onContinue);
    }
  }

  return (
    <View style={s.fields}>
      <Input
        label="Email Address"
        required
        placeholder="Enter your email"
        value={email}
        onChangeText={(value) => {
          onEmailChange(value);
          setError("");
        }}
        inputMode="email"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        returnKeyType="next"
      />
      <Input
        label="Password"
        required
        placeholder={path === "signup" ? "Create a password" : "Enter your password"}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError("");
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={256}
        onSubmitEditing={path === "signin" ? submit : undefined}
        returnKeyType={path === "signin" ? "go" : "next"}
      />
      {path === "signup" ? (
        <Input
          label="Confirm Password"
          required
          placeholder="Re-enter your password"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            setError("");
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={256}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
      ) : null}
      {path === "signin" ? (
        <View style={s.signinRow}>
          <View style={s.remember}>
            <Checkbox
              checked={remember}
              label="Remember me"
              onToggle={() => setRemember(!remember)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot password?"
            onPress={() => leave(onReset)}
            style={({ pressed }) => [s.inlineLink, pressed && s.pressed]}
          >
            <Text style={t.link}>Forgot password?</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <FormError message={error} /> : null}
      <Button
        title={path === "signup" ? "Create Account" : "Sign In"}
        onPress={submit}
      />
      <View style={s.switchRow}>
        <Text style={t.help}>
          {path === "signup" ? "Have an account? " : "Don’t have an account? "}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={path === "signup" ? "Sign in" : "Sign up"}
          onPress={() => leave(onSwitch)}
          style={({ pressed }) => pressed && s.pressed}
        >
          <Text style={t.link}>{path === "signup" ? "Sign in" : "Sign up"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={t.error}>
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
      <Text style={[t.link, s.linkCentered]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 14 },
  frame: { width: "100%", maxWidth: 440, alignSelf: "center" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    alignSelf: "flex-start",
    paddingRight: 8,
  },
  backText: { color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  logo: { alignItems: "center", paddingVertical: 14 },
  card: {
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    backgroundColor: C.white,
    gap: 18,
  },
  progress: { flexDirection: "row", gap: 8 },
  progressItem: { flex: 1, gap: 7 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: C.border },
  progressBarActive: { backgroundColor: C.primary },
  progressLabel: {
    fontFamily: F.medium,
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
  },
  progressLabelActive: { color: C.primary, fontFamily: F.semibold },
  heading: { gap: 6, alignItems: "center" },
  title: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  description: {
    color: C.muted,
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  fields: { gap: 14 },
  field: { gap: 7 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    justifyContent: "center",
    backgroundColor: C.white,
  },
  choiceSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  choiceText: { color: C.text, fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  choiceTextSelected: { color: C.primaryDark, fontFamily: F.semibold },
  signinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  remember: { flexShrink: 1 },
  inlineLink: { minHeight: 44, justifyContent: "center" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 32,
  },
  textLink: { minHeight: 44, justifyContent: "center" },
  linkCentered: { textAlign: "center" },
  pressed: { opacity: 0.65 },
  legal: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 12,
  },
  legalLink: { color: C.primary, fontFamily: F.medium },
});

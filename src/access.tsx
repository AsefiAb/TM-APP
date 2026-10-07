import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Button, C, Icon, ui } from "./ui";
import { AuthPreviewPath, AuthWalkthrough } from "./auth-walkthrough";

type Access = {
  mode: "welcome" | "demo";
  enterDemo: () => void;
  leaveDemo: () => void;
};

const AccessContext = createContext<Access | null>(null);

/** A preview choice only. It is not an authenticated session or security gate. */
export function AccessProvider({ children }: React.PropsWithChildren) {
  const [mode, setMode] = useState<Access["mode"]>("welcome");
  const enterDemo = useCallback(() => setMode("demo"), []);
  const leaveDemo = useCallback(() => setMode("welcome"), []);
  const value = useMemo(
    () => ({ mode, enterDemo, leaveDemo }),
    [mode, enterDemo, leaveDemo],
  );
  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error("AccessProvider is required");
  return context;
}

export function WelcomeScreen() {
  const { enterDemo } = useAccess();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [previewPath, setPreviewPath] = useState<AuthPreviewPath | null>(null);

  async function openSam() {
    setError("");
    setOpening(true);
    try {
      // Opening the website never changes this app's access mode.
      await Linking.openURL("https://sam3.txhd.io/");
    } catch {
      setError(
        "SAM could not open. Try again, or visit sam3.txhd.io in your browser.",
      );
    } finally {
      setOpening(false);
    }
  }

  if (previewPath) {
    return (
      <AuthWalkthrough
        initialPath={previewPath}
        onBack={() => setPreviewPath(null)}
        onEnterDemo={enterDemo}
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.frame}>
          <Brand />
          <View style={s.introduction}>
            <Text accessibilityRole="header" style={s.title}>
              Your business,{"\n"}in your pocket.
            </Text>
            <Text style={s.subtitle}>
              Campaigns, replies and billing. All together.
            </Text>
          </View>
          <View style={s.actions}>
            <Button
              title="Preview sign up"
              onPress={() => setPreviewPath("signup")}
            />
            <Button
              title="Preview sign in"
              variant="secondary"
              onPress={() => setPreviewPath("signin")}
            />
            <Button
              title="Explore the demo"
              icon="arrow-right"
              variant="ghost"
              onPress={enterDemo}
            />
            <Text style={s.previewNote}>
              Sample details. No account created or messages sent.
            </Text>
          </View>
          <View style={s.website}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                opening ? "Opening SAM…" : "Open SAM website sign-in"
              }
              accessibilityState={{ disabled: opening }}
              disabled={opening}
              onPress={openSam}
              style={({ pressed }) => [s.websiteLink, pressed && s.pressed]}
            >
              <Text style={s.websiteText}>
                {opening ? "Opening SAM…" : "Open SAM website sign-in"}
              </Text>
              <Icon name="external-link" size={14} color={C.primary} />
            </Pressable>
            <Text style={s.connectionNote}>
              For your real account. Mobile sign-in is not connected yet.
            </Text>
            {error ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={ui.error}
              >
                {error}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 36,
    justifyContent: "center",
  },
  frame: { width: "100%", maxWidth: 380, alignSelf: "center", gap: 32 },
  introduction: { gap: 12 },
  title: {
    color: C.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  subtitle: { color: C.muted, fontSize: 15, lineHeight: 23 },
  actions: { gap: 10 },
  previewNote: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  website: {
    gap: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  websiteLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  websiteText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.primary,
    fontWeight: "600",
  },
  connectionNote: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  pressed: { opacity: 0.65 },
});

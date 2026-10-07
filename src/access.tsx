import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Button, C, Icon, IconName, ui } from "./ui";

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

const features: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "send",
    title: "Campaigns",
    description: "Make your next message count.",
  },
  {
    icon: "message-circle",
    title: "Inbox",
    description: "Keep conversations close.",
  },
  {
    icon: "credit-card",
    title: "Billing",
    description: "See the essentials at a glance.",
  },
];

export function WelcomeScreen() {
  const { enterDemo } = useAccess();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function openSam() {
    setError("");
    setOpening(true);
    try {
      // Opening the website never changes this app's access mode.
      await Linking.openURL("https://sam3.txhd.io/");
    } catch {
      setError(
        "SAM could not open. Please try again, or visit sam3.txhd.io in your browser.",
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, wide && s.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.frame}>
          <View style={s.brand}>
            <Brand />
          </View>
          <View style={[s.content, wide && s.contentWide]}>
            <View style={[s.introduction, wide && s.introductionWide]}>
              <Text style={s.eyebrow}>SAM AI · ON THE GO</Text>
              <Text
                accessibilityRole="header"
                style={[s.title, wide && s.titleWide]}
              >
                Your business.{"\n"}Connected.
              </Text>
              <Text style={s.subtitle}>
                A little less work. A lot more connection. Your everyday
                essentials, together in one place.
              </Text>
              <View style={[s.features, !wide && s.featuresCompact]}>
                {features.map((feature) => (
                  <View
                    key={feature.title}
                    style={[s.feature, !wide && s.featureCompact]}
                  >
                    <View
                      style={[s.featureIcon, !wide && s.featureIconCompact]}
                    >
                      <Icon
                        name={feature.icon}
                        color={C.primary}
                        size={wide ? 20 : 15}
                      />
                    </View>
                    <View style={wide && ui.grow}>
                      <Text
                        style={[s.featureTitle, !wide && s.featureTitleCompact]}
                      >
                        {feature.title}
                      </Text>
                      {wide ? (
                        <Text style={s.featureDescription}>
                          {feature.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={[s.card, wide && s.cardWide]}>
              {wide ? (
                <View style={s.welcomeIcon}>
                  <Icon name="log-in" color={C.primary} size={25} />
                </View>
              ) : null}
              <Text accessibilityRole="header" style={s.cardTitle}>
                Welcome to SAM AI
              </Text>
              <Text style={s.cardDescription}>
                Use your existing SAM account on the web, or take a look around
                the mobile preview.
              </Text>
              <Button
                title={opening ? "Opening SAM…" : "Open SAM sign-in"}
                icon="external-link"
                onPress={openSam}
                disabled={opening}
              />
              <Text style={s.connectionNote}>
                Opens SAM in your browser. Mobile account sign-in is not
                connected yet.
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
              <View style={s.divider} />
              <Button
                title="Explore the demo"
                icon="arrow-right"
                variant="secondary"
                onPress={enterDemo}
              />
              <Text style={s.demoNote}>
                Sample contacts and messages. Nothing is sent or charged.
              </Text>
            </View>
          </View>
          <Text style={s.footer}>Powered by Textmunication</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  scrollWide: { padding: 48 },
  frame: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  brand: { marginBottom: 28 },
  content: { gap: 24 },
  contentWide: { flexDirection: "row", gap: 72, alignItems: "center" },
  introduction: { gap: 14 },
  introductionWide: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: C.primary,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  title: {
    color: C.ink,
    fontSize: 36,
    lineHeight: 41,
    fontWeight: "700",
    letterSpacing: -1.3,
  },
  titleWide: { fontSize: 52, lineHeight: 57, letterSpacing: -2 },
  subtitle: { color: C.muted, fontSize: 16, lineHeight: 25, maxWidth: 400 },
  features: { gap: 14, marginTop: 10 },
  featuresCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 0,
  },
  feature: { flexDirection: "row", alignItems: "center", gap: 13 },
  featureCompact: {
    gap: 7,
    backgroundColor: C.lilac,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconCompact: { width: 15, height: 15, borderRadius: 0 },
  featureTitle: {
    color: C.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  featureTitleCompact: { fontSize: 12, lineHeight: 18 },
  featureDescription: { color: C.muted, fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  cardWide: { width: 390, padding: 30 },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: C.ink,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  cardDescription: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: -7,
    marginBottom: 4,
  },
  connectionNote: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  demoNote: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -6,
  },
  footer: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 30,
  },
});

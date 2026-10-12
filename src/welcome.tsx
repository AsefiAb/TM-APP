import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccess } from "./access";
import { AuthPath, AuthWalkthrough } from "./auth-walkthrough";
import { SamLogo, TextmunicationLogo } from "./brand";
import { Button, C, F, Icon, R } from "./ui";

/** The first screen: Textmunication brand, the SAM AI product, two entry paths. */
export function WelcomeScreen() {
  const { completeSetup, signIn } = useAccess();
  const [authPath, setAuthPath] = useState<AuthPath | null>(null);

  if (authPath) {
    return (
      <AuthWalkthrough
        initialPath={authPath}
        onBack={() => setAuthPath(null)}
        onSignIn={signIn}
        onCompleteSetup={completeSetup}
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
          <View style={s.top}>
            <TextmunicationLogo width={176} />
          </View>

          <View style={s.hero}>
            <View style={s.pill}>
              <View style={s.pillDot} />
              <Text style={s.pillText}>SAM AI PLATFORM</Text>
            </View>
            <Text accessibilityRole="header" style={s.title}>
              Turn every text{"\n"}
              <Text style={s.titleAccent}>into revenue.</Text>
            </Text>
            <Text style={s.subtitle}>
              Prepare campaigns, grow your subscriber list, and keep your SAM
              workspace close at hand. Built for iPhone and Android.
            </Text>
          </View>

          <View style={s.preview} accessible accessibilityLabel="SAM AI preview">
            <View style={s.previewHeader}>
              <SamLogo height={18} />
              <Text style={s.previewMeta}>Dashboard</Text>
            </View>
            <View style={s.previewStats}>
              <PreviewStat label="Subscribers" value="14,829" trend="+8.2%" />
              <PreviewStat label="Campaigns" value="142" trend="+24 this mo." />
            </View>
            <View style={s.bubble}>
              <Icon name="message-square" size={15} color={C.primary} />
              <Text style={s.bubbleText} numberOfLines={2}>
                Hey Sarah! VIP early access starts Monday. Reply YES to claim
                your spot.
              </Text>
            </View>
          </View>

          <View style={s.actions}>
            <Button
              title="Create account"
              icon="arrow-right"
              onPress={() => setAuthPath("signup")}
            />
            <Button
              title="Sign in"
              variant="outline"
              onPress={() => setAuthPath("signin")}
            />
            <Text style={s.footnote}>
              SMS · MMS · RCS · WhatsApp. 10DLC compliant, carrier approved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreviewStat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <View style={s.previewStat}>
      <Text style={s.previewLabel}>{label.toUpperCase()}</Text>
      <Text style={s.previewValue}>{value}</Text>
      <Text style={s.previewTrend}>{trend}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    justifyContent: "center",
  },
  frame: { width: "100%", maxWidth: 400, alignSelf: "center", gap: 26 },
  top: { alignItems: "flex-start" },
  hero: { gap: 12 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    backgroundColor: C.primarySoft,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  pillText: {
    color: C.primaryDark,
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
  },
  title: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -1.2,
  },
  titleAccent: { color: C.primary },
  subtitle: {
    color: C.muted,
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 23,
  },
  preview: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    backgroundColor: C.bg,
    padding: 14,
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewMeta: {
    color: C.muted,
    fontFamily: F.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  previewStats: { flexDirection: "row", gap: 10 },
  previewStat: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    gap: 2,
  },
  previewLabel: {
    color: C.muted,
    fontFamily: F.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  previewValue: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  previewTrend: {
    color: C.green,
    fontFamily: F.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  bubbleText: {
    flex: 1,
    color: C.text,
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: { gap: 10 },
  footnote: {
    color: C.faint,
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 6,
  },
});

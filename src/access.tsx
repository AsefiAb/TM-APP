import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Button, C } from "./ui";
import { AuthPath, AuthWalkthrough } from "./auth-walkthrough";

type Access = {
  mode: "welcome" | "demo";
  businessName: string;
  completeSetup: (name: string) => void;
  enterDemo: () => void;
  leaveDemo: () => void;
};

const AccessContext = createContext<Access | null>(null);

/** A preview choice only. It is not an authenticated session or security gate. */
export function AccessProvider({ children }: React.PropsWithChildren) {
  const [mode, setMode] = useState<Access["mode"]>("welcome");
  const [businessName, setBusinessName] = useState("Your business");
  const enterDemo = useCallback(() => setMode("demo"), []);
  const leaveDemo = useCallback(() => {
    setBusinessName("Your business");
    setMode("welcome");
  }, []);
  const completeSetup = useCallback((name: string) => {
    setBusinessName(name.trim() || "Your business");
    setMode("demo");
  }, []);
  const value = useMemo(
    () => ({ mode, businessName, completeSetup, enterDemo, leaveDemo }),
    [mode, businessName, completeSetup, enterDemo, leaveDemo],
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
  const { enterDemo, completeSetup } = useAccess();
  const [authPath, setAuthPath] = useState<AuthPath | null>(null);

  if (authPath) {
    return (
      <AuthWalkthrough
        initialPath={authPath}
        onBack={() => setAuthPath(null)}
        onEnterDemo={enterDemo}
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
              title="Create account"
              onPress={() => setAuthPath("signup")}
            />
            <Button
              title="Sign in"
              variant="secondary"
              onPress={() => setAuthPath("signin")}
            />
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
});

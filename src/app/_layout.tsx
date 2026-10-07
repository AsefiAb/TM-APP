import { useEffect, useRef } from "react";
import { router, Stack, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DemoProvider } from "../store";
import { AccessProvider, useAccess, WelcomeScreen } from "../access";
import { C } from "../ui";

function AppContent() {
  const { mode } = useAccess();
  const navigationState = useRootNavigationState();
  const openedHome = useRef(false);
  useEffect(() => {
    if (mode === "welcome") {
      openedHome.current = false;
      return;
    }
    // Wait for the navigator before starting the walkthrough at Home.
    if (navigationState?.key && !openedHome.current) {
      openedHome.current = true;
      router.replace("/");
    }
  }, [mode, navigationState?.key]);
  if (mode === "welcome") return <WelcomeScreen />;

  return (
    <DemoProvider fresh>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: C.bg },
        }}
      />
    </DemoProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AccessProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AccessProvider>
    </SafeAreaProvider>
  );
}

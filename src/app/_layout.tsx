import { useEffect, useRef } from "react";
import { View } from "react-native";
import { router, Stack, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { WorkspaceProvider } from "../store";
import { AccessProvider, useAccess } from "../access";
import { WelcomeScreen } from "../welcome";
import { C } from "../ui";

// Keep the native splash visible until fonts and the saved session are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { ready, mode } = useAccess();
  const navigationState = useRootNavigationState();
  const cameFromWelcome = useRef(false);
  const openedHome = useRef(false);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (mode === "welcome") {
      cameFromWelcome.current = true;
      openedHome.current = false;
      return;
    }
    // After signing in, start at the dashboard once the navigator exists.
    // A restored session keeps whatever route was opened (deep links, reloads).
    if (cameFromWelcome.current && navigationState?.key && !openedHome.current) {
      openedHome.current = true;
      router.replace("/");
    }
  }, [mode, navigationState?.key]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.white }} />;
  if (mode === "welcome") return <WelcomeScreen />;

  return (
    <WorkspaceProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: C.bg },
        }}
      />
    </WorkspaceProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // Fonts fall back to the system typeface if they cannot load.
  if (!fontsLoaded && !fontError)
    return <View style={{ flex: 1, backgroundColor: C.white }} />;
  return (
    <SafeAreaProvider>
      <AccessProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AccessProvider>
    </SafeAreaProvider>
  );
}

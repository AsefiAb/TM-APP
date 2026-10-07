import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DemoProvider } from "../store";
import { AccessProvider, useAccess, WelcomeScreen } from "../access";
import { C } from "../ui";

function AppContent() {
  const { mode } = useAccess();
  if (mode === "welcome") return <WelcomeScreen />;

  return (
    <DemoProvider>
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

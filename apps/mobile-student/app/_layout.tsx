import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B3D2E" },
          headerTintColor: "#F5E6A8",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
    </AuthProvider>
  );
}

/**
 * App.tsx — React Native integration example for Hot Updater S3 Server
 *
 * Install:
 *   npm install @hot-updater/react-native
 *
 * Wrap your root App component with HotUpdater.wrap().
 * The baseURL must point to your self-hosted Express server.
 */

import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { HotUpdater, useHotUpdaterState } from "@hot-updater/react-native";

// ─── Your actual App component ────────────────────────────────────────────────
function AppContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My React Native App</Text>
    </View>
  );
}

// ─── Update loading screen ────────────────────────────────────────────────────
function UpdateScreen() {
  const { status, progress } = useHotUpdaterState();

  return (
    <View style={styles.updateContainer}>
      <ActivityIndicator size="large" color="#0066FF" />
      <Text style={styles.updateText}>
        {status === "DOWNLOADING"
          ? `Downloading update... ${Math.round(progress * 100)}%`
          : "Applying update..."}
      </Text>
    </View>
  );
}

// ─── Wrap with HotUpdater ─────────────────────────────────────────────────────
export default HotUpdater.wrap({
  // Point to your self-hosted Express server
  baseURL: "https://your-domain.com/hot-updater",

  // "appVersion" checks native app version (semver range in bundle config)
  // "fingerprint" checks Expo fingerprint hash
  updateStrategy: "appVersion",

  // "auto"      → download + install silently in background
  // "live"      → apply immediately when update is ready
  // "manual"    → you control when to apply via HotUpdater.reload()
  updateMode: "auto",

  // Custom loading UI shown during download/install
  fallbackComponent: UpdateScreen,

  onError: (error) => {
    console.error("[HotUpdater] Update error:", error);
    // Don't crash the app on update errors — just continue with current bundle
  },
})(AppContent);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
  },
  updateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 16,
  },
  updateText: {
    fontSize: 16,
    color: "#333",
  },
});

import { ExpoConfig, ConfigContext } from "expo/config";

// Load .env for local dev; EAS injects EXPO_PUBLIC_* via project env. Optional when node_modules is incomplete.
try {
  require("dotenv/config");
} catch {
  /* noop */
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  /** TestFlight crash: Fabric RNSScreen snapshot + TurboModule. Disable New Arch to validate (requires new native build). */
  newArchEnabled: false,
  name: "First Choice Transportation",
  slug: "firstchoicetransportation",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "firstchoice",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    /** CFBundleVersion — bump each App Store / TestFlight upload (EAS `autoIncrement` is unsupported with app.config.ts). */
    buildNumber: "25",
    bundleIdentifier: "com.firstchoicetransportation.timesheet",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location"],
      NSLocationWhenInUseUsageDescription:
        "This app needs location access to track your shift and verify work hours.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "This app needs background location to track your shift and verify work hours.",
      NSLocationAlwaysUsageDescription:
        "This app needs background location to track your shift and verify work hours.",
    },
  },
  android: {
    /** Increment for each Play Store upload; keep in step with iOS buildNumber when possible. */
    versionCode: 25,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.firstchoicetransportation.timesheet",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
    ],
  },
  plugins: [
    "expo-asset",
    "expo-font",
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "This app needs location access to track your shift and verify work hours.",
        locationAlwaysAndWhenInUsePermission:
          "This app needs background location to track your shift and verify work hours.",
        locationAlwaysPermission:
          "This app needs background location to track your shift and verify work hours.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
  },
  owner: "bferrell514",
  extra: {
    eas: {
      projectId: "8c5af85c-7504-4425-8209-7d14ce0eedab",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
});

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
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.firstchoicetransportation.timesheet",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location"],
      NSLocationWhenInUseUsageDescription:
        "When you start a work shift, First Choice uses your location to verify clock-in and record route evidence.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "During an active shift, First Choice records location in the background to verify your route and return to an approved base.",
      NSLocationAlwaysUsageDescription:
        "During an active shift, First Choice records location in the background to verify your route and return to an approved base.",
    },
  },
  android: {
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
          "When you start a work shift, First Choice uses your location to verify clock-in and record route evidence.",
        locationAlwaysAndWhenInUsePermission:
          "During an active shift, First Choice records location in the background to verify your route and return to an approved base.",
        locationAlwaysPermission:
          "During an active shift, First Choice records location in the background to verify your route and return to an approved base.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    "expo-notifications",
    "@react-native-community/datetimepicker",
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

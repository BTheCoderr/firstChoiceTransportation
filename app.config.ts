import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "First Choice Transportation",
  slug: "firstchoicetransportation",
  version: "1.0.0",
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
    bundleIdentifier: "com.firstchoicetransportation.timesheet",
    infoPlist: {
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
    "expo-font",
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "This app needs location access to track your shift and verify work hours.",
        locationAlwaysAndWhenInUsePermission:
          "This app needs background location to track your shift and verify work hours.",
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
  },
});

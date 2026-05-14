import { useMemo } from "react";
import { Stack } from "expo-router";
import { iosNativeStackMitigation } from "@/navigation/iosNativeStackOptions";

export default function AuthLayout() {
  const screenOptions = useMemo(
    () => ({
      ...iosNativeStackMitigation,
      headerShown: false,
    }),
    []
  );

  return <Stack screenOptions={screenOptions} />;
}

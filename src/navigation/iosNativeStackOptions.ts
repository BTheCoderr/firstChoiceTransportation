import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * Stabilization for Fabric + react-native-screens (e.g. snapshot/unmount on iOS):
 * `freezeOnBlur: false` avoids suspending inactive screens in ways that interact badly
 * with transitions.
 *
 * **Keep `react-native-screens` on the version Expo pins** (see `npx expo install react-native-screens`
 * / `bundledNativeModules` for your SDK). Newer JS than Expo Go’s embedded native screens can
 * crash at `<Stack>` with `expected dynamic type 'boolean', but had type 'string'`.
 *
 * Do not set `animation` / `stackAnimation` here unless you control matching native code.
 *
 * Native stack does not expose `detachInactiveScreens` (bottom-tabs only); see `(driver)/_layout.tsx`.
 */
export const iosNativeStackMitigation: Partial<NativeStackNavigationOptions> = {
  freezeOnBlur: false,
};

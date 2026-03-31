import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, spacing } from "@/theme/spacing";

export type ScreenSafeAreaMode = "navContent" | "fullBleed";

export type ScreenContainerProps = {
  children: ReactNode;
  /** Default true: body scrolls; set false for loading/empty centered layouts. */
  scroll?: boolean;
  /** Wraps content in KeyboardAvoidingView (iOS padding). */
  keyboardAvoiding?: boolean;
  /**
   * `navContent`: under Stack/Tabs header — only horizontal + bottom safe padding.
   * `fullBleed`: no native header (auth, root) — SafeAreaView on all edges.
   */
  safeAreaMode?: ScreenSafeAreaMode;
  refreshControl?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: layout.screenBackground,
  },
  flex: {
    flex: 1,
  },
});

/**
 * Standard screen wrapper: background, horizontal padding, bottom safe inset,
 * optional scroll and keyboard avoidance.
 */
export function ScreenContainer({
  children,
  scroll = true,
  keyboardAvoiding = false,
  safeAreaMode = "navContent",
  refreshControl,
  contentContainerStyle,
  style,
  keyboardShouldPersistTaps = "handled",
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const bottomPadNav = spacing.bottomContent + Math.max(insets.bottom, spacing.sm);

  const horizontal = layout.screenHorizontal;
  const paddingStyle: ViewStyle =
    safeAreaMode === "navContent"
      ? {
          paddingHorizontal: horizontal,
          paddingTop: spacing.screenTopNav,
          paddingBottom: bottomPadNav,
        }
      : {
          paddingHorizontal: horizontal,
          paddingTop: spacing.sm,
          paddingBottom: spacing.bottomContent,
        };

  const scrollBody = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[paddingStyle, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  const staticBody = (
    <View style={[styles.flex, paddingStyle, contentContainerStyle]}>{children}</View>
  );

  const body = scroll ? scrollBody : staticBody;

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  if (safeAreaMode === "fullBleed") {
    return (
      <SafeAreaView style={[styles.root, style]} edges={["top", "bottom", "left", "right"]}>
        {wrapped}
      </SafeAreaView>
    );
  }

  return <View style={[styles.root, style]}>{wrapped}</View>;
}

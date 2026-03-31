import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { colors, spacing } from "@/theme/spacing";

type SectionHeadingProps = TextProps & {
  size?: "large" | "medium";
  style?: StyleProp<TextStyle>;
};

/** Primary on-screen headline (e.g. greeting). */
export function ScreenHeadline({ style, ...rest }: TextProps) {
  return (
    <Text
      style={[{ fontSize: 24, fontWeight: "600", color: colors.text, marginBottom: spacing.afterHeadline }, style]}
      {...rest}
    />
  );
}

/** Page title under navigation (forms, profile blocks). */
export function ScreenTitle({ style, ...rest }: TextProps) {
  return (
    <Text
      style={[{ fontSize: 22, fontWeight: "600", color: colors.text, marginBottom: spacing.sm }, style]}
      {...rest}
    />
  );
}

/** Muted paragraph under a title. */
export function ScreenLead({ style, ...rest }: TextProps) {
  return (
    <Text
      style={[{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.xxl }, style]}
      {...rest}
    />
  );
}

/** Section label (lists, grouped content). */
export function SectionHeading({ size = "medium", style, ...rest }: SectionHeadingProps) {
  const preset =
    size === "large"
      ? {
          fontSize: 18,
          fontWeight: "600" as const,
          color: colors.text,
          marginBottom: spacing.lg,
        }
      : {
          fontSize: 16,
          fontWeight: "600" as const,
          color: "#475569",
          marginBottom: spacing.md,
        };
  return <Text style={[preset, style]} {...rest} />;
}

/** Helper text, captions. */
export function Caption({ style, ...rest }: TextProps) {
  return <Text style={[{ fontSize: 14, color: colors.textSubtle }, style]} {...rest} />;
}

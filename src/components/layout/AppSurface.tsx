import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme/spacing";

type AppSurfaceProps = ViewProps & {
  variant?: "default" | "muted" | "warn";
  style?: StyleProp<ViewStyle>;
};

const variantStyles = {
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  warn: {
    backgroundColor: "#fefce8",
    borderColor: "#fef08a",
  },
} as const;

/** Card-style panel (admin tools, grouped blocks). */
export function AppSurface({ variant = "default", style, ...rest }: AppSurfaceProps) {
  return (
    <View
      style={[
        {
          padding: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          ...variantStyles[variant],
        },
        style,
      ]}
      {...rest}
    />
  );
}

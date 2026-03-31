import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { spacing } from "@/theme/spacing";
import { SectionHeading } from "./ScreenTypography";

type ScreenSectionProps = ViewProps & {
  title?: string;
  titleSize?: "large" | "medium";
  /** Extra space before this section (e.g. after previous block). */
  spacingTop?: number;
  style?: StyleProp<ViewStyle>;
};

/** Vertical rhythm wrapper; optional section title. */
export function ScreenSection({
  title,
  titleSize = "medium",
  spacingTop = 0,
  style,
  children,
  ...rest
}: ScreenSectionProps) {
  return (
    <View style={[{ marginTop: spacingTop, marginBottom: spacing.sectionGap }, style]} {...rest}>
      {title ? <SectionHeading size={titleSize}>{title}</SectionHeading> : null}
      {children}
    </View>
  );
}

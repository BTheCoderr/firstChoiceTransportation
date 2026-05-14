import { AppDiagnosticsPanel } from "@/components/AppDiagnosticsPanel";
import { ScreenContainer } from "@/components/layout";

/** Hidden from tab bar via `Tabs.Screen options={{ href: null }}` — open from Profile. */
export default function DriverDiagnosticsScreen() {
  return (
    <ScreenContainer scroll={false}>
      <AppDiagnosticsPanel />
    </ScreenContainer>
  );
}

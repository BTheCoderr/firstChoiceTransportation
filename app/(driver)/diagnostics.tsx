import { AppDiagnosticsPanel } from "@/components/AppDiagnosticsPanel";
import { ScreenContainer } from "@/components/layout";

export default function DriverDiagnosticsScreen() {
  return (
    <ScreenContainer scroll={false}>
      <AppDiagnosticsPanel />
    </ScreenContainer>
  );
}

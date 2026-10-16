import { AppDiagnosticsPanel } from "@/components/AppDiagnosticsPanel";
import { ScreenContainer } from "@/components/layout";

export default function AdminDiagnosticsScreen() {
  return (
    <ScreenContainer scroll={false}>
      <AppDiagnosticsPanel />
    </ScreenContainer>
  );
}

import { AppDiagnosticsPanel } from "@/components/AppDiagnosticsPanel";
import { ScreenContainer } from "@/components/layout";

/** Open from Admin dashboard footer link. */
export default function AdminDiagnosticsScreen() {
  return (
    <ScreenContainer scroll={false}>
      <AppDiagnosticsPanel />
    </ScreenContainer>
  );
}

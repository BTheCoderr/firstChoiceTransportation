import { Component, type ErrorInfo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { setSessionState } from "@/services/sessionService";

type Props = { children: ReactNode };
type State = { failed: boolean; resetting: boolean; generation: number };

/**
 * Protects against uncaught JavaScript render errors, not OS/native crashes.
 * Error details can contain employee information; never render them in builds
 * or send them to console in production.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetting: false, generation: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  private retry = (): void => {
    this.setState((state) => ({
      failed: false, resetting: false, generation: state.generation + 1,
    }));
  };

  private resetSession = (): void => {
    if (this.state.resetting) return;
    this.setState({ resetting: true });
    void (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Even when the network is unavailable, reset the local application session.
      } finally {
        setSessionState(null);
        this.retry();
      }
    })();
  };

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>First Choice needs to restart this screen</Text>
          <Text style={styles.body}>
            Your shift and payroll records stay on the server. If this happens
            again, contact your administrator and share the app version from
            Diagnostics. Do not share private location or payroll screenshots.
          </Text>
          <Pressable accessibilityRole="button"
            accessibilityLabel="Try loading First Choice again"
            style={styles.primary} disabled={this.state.resetting} onPress={this.retry}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel="Sign out of this device and restart"
            style={styles.secondary} disabled={this.state.resetting} onPress={this.resetSession}>
            {this.state.resetting ? <ActivityIndicator color="#2563eb" /> :
              <Text style={styles.secondaryText}>Sign out on this device</Text>}
          </Pressable>
        </View>
      );
    }
    return <View key={this.state.generation} style={styles.children}>{this.props.children}</View>;
  }
}

const styles = StyleSheet.create({
  children: { flex: 1 },
  screen: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#f8fafc" },
  title: { fontSize: 23, color: "#0f172a", fontWeight: "700", marginBottom: 16 },
  body: { fontSize: 15, color: "#475569", lineHeight: 23, marginBottom: 24 },
  primary: { minHeight: 48, backgroundColor: "#2563eb", borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginBottom: 12 },
  primaryText: { fontWeight: "700", fontSize: 16, color: "#fff" },
  secondary: { minHeight: 48, borderRadius: 10, borderColor: "#2563eb",
    borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontWeight: "600", color: "#2563eb" },
});

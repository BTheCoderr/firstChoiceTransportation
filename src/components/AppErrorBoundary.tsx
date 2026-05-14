import React, { Component, type ErrorInfo, type ReactNode } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { setSessionState } from "@/services/sessionService";

type Props = { children: ReactNode };

type State = { error: Error | null; resetting: boolean };

/**
 * Root-level fallback for uncaught JS errors — avoids silent white screen /
 * immediate kill without context. Uses local-only sign-out (no router).
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetting: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error.message, error.stack);
    console.error("[AppErrorBoundary] componentStack", info.componentStack);
  }

  handleResetSession = (): void => {
    if (this.state.resetting) return;
    this.setState({ resetting: true });
    void (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* best-effort */
      }
      setSessionState(null);
      this.setState({ error: null, resetting: false });
    })();
  };

  render(): ReactNode {
    if (this.state.error) {
      const msg =
        typeof this.state.error.message === "string" &&
        this.state.error.message.length > 0
          ? this.state.error.message
          : String(this.state.error);
      return (
        <View style={styles.wrap}>
          <ScrollView contentContainerStyle={styles.inner}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.detail} selectable>
              {msg}
            </Text>
            <Text style={styles.hint}>
              If sign-out or navigation failed, tap below to clear the local session
              and try again.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              disabled={this.state.resetting}
              onPress={this.handleResetSession}
              accessibilityRole="button"
              accessibilityLabel="Reset app session"
            >
              {this.state.resetting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset app session</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  inner: {
    padding: 24,
    justifyContent: "center",
    flexGrow: 1,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  detail: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
    lineHeight: 20,
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Noget gik galt</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Ukendt fejl"}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f87171",
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: "#e2e8f0",
    textAlign: "center",
  },
});

import { Detail, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import JouleLendForm from "./components/joule/JouleLendForm";

interface WalletCredentials {
  address: string;
  privateKey: string;
}

export default function JouleLend() {
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState<WalletCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authenticate();
  }, []);

  async function authenticate() {
    try {
      setIsLoading(true);
      console.log("Starting authentication for Joule Lend...");
      await provider.authorize();
      console.log("Authentication successful!");
      await loadWalletCredentials();
    } catch (err) {
      console.error("Auth error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: err instanceof Error ? err.message : "Please try again",
      });
      setIsLoading(false);
    }
  }

  async function loadWalletCredentials() {
    try {
      const result = await executeAction<WalletCredentials>("getWalletCredentials", {}, false);
      if (result.data) {
        setCredentials(result.data);
      } else {
        setError("Failed to load wallet credentials");
      }
    } catch (err) {
      console.error("Error loading credentials:", err);
      setError(err instanceof Error ? err.message : "Failed to load wallet");
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to load wallet",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOperationComplete() {
    // Refresh credentials after operation
    await loadWalletCredentials();
  }

  if (isLoading) {
    return <Detail isLoading markdown="# Loading Joule Lend...\n\nPlease wait while we authenticate and load your wallet..." />;
  }

  if (error || !credentials) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error || "Failed to load wallet credentials"}\n\nPlease try again.`}
      />
    );
  }

  return (
    <JouleLendForm
      privateKey={credentials.privateKey}
      address={credentials.address}
      onOperationComplete={handleOperationComplete}
    />
  );
}


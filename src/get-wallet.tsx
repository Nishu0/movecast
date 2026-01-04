import { ActionPanel, Action, Detail, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import GetPortfolio from "./get-portfolio";

interface WalletData {
  address: string;
  explorerUrl: string;
}

interface BalanceData {
  address: string;
  balance: number;
  balanceFormatted: string;
  symbol: string;
  explorerUrl: string;
}

function GetWalletAddress() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [explorerUrl, setExplorerUrl] = useState<string>("");

  useEffect(() => {
    authenticate();
  }, []);

  async function authenticate() {
    try {
      setIsLoading(true);
      console.log("Starting authentication...");
      await provider.authorize();
      console.log("Authentication successful!");
      await loadWallet();
    } catch (error) {
      console.error("Auth error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: error instanceof Error ? error.message : "Please try again",
      });
      setIsLoading(false);
    }
  }

  async function loadWallet() {
    try {
      // Get wallet address
      const walletResult = await executeAction<WalletData>("getWalletAddress", {}, false);
      if (walletResult.data) {
        setWalletAddress(walletResult.data.address);
        setExplorerUrl(walletResult.data.explorerUrl);
      }

      // Get MOVE balance
      const balanceResult = await executeAction<BalanceData>("getMoveBalance", {}, false);
      if (balanceResult.data) {
        setBalance(balanceResult.data.balanceFormatted);
      }
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load wallet",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    await showToast(Toast.Style.Animated, "Signing Out...");
    try {
      await provider.signOut();
      await showToast({
        style: Toast.Style.Success,
        title: "Signed Out",
        message: "You have been signed out",
      });
      pop();
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to sign out",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = `# 🟣 Movement Wallet

${
  isLoading
    ? `
## Loading...
Please wait while we fetch your wallet...
`
    : walletAddress
      ? `
### Your Movement Wallet Address

\`\`\`
${walletAddress}
\`\`\`

### Your MOVE Balance

\`\`\`
${balance} MOVE
\`\`\`

---

[🔍 View on Movement Explorer](${explorerUrl})

`
      : `
## ❌ Error Loading Wallet
Unable to fetch your wallet address. Please try refreshing.
`
}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Wallet Address"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Wallet Address" content={walletAddress} icon={Icon.CopyClipboard} />
          <Action.Push title="View Portfolio" target={<GetPortfolio />} />
          <Action title="Sign Out" onAction={signOut} />
        </ActionPanel>
      }
    />
  );
}

export default GetWalletAddress;
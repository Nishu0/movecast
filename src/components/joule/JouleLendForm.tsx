import {
  ActionPanel,
  Action,
  Form,
  useNavigation,
  showToast,
  Toast,
  Detail,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { lendToken } from "../../actions/joule/lend";
import { formatAddress, getExplorerUrl } from "../../utils/aptos";
import tokenList from "../../token.json";

// Movement mainnet RPC endpoint
const MOVEMENT_RPC = "https://mainnet.movementnetwork.xyz/v1";

// Token type from token.json
interface TokenData {
  assetName: string;
  type: string;
  provider: string;
  displayName: string;
  pythId: string;
  ltv: number;
  faAddress: string | null;
  efficiencyMode: number;
  efficiencyLtv: number;
  icon: string;
  decimals: number;
  liquidationFactor: number;
  efficientLiquidationFactor: number;
  source?: string;
  isFungible: boolean;
  coingeckoId: string;
}

interface JouleLendFormProps {
  privateKey: string;
  address: string;
  onOperationComplete?: () => void;
}

// Get decimals from the token data (stored as 1e8 format, need to extract exponent)
function getDecimals(decimalsValue: number): number {
  if (decimalsValue === 1e8) return 8;
  if (decimalsValue === 1e6) return 6;
  // Fallback: calculate from the value
  return Math.log10(decimalsValue);
}

// Fetch token balance from Movement RPC
async function fetchTokenBalance(
  walletAddress: string,
  token: TokenData
): Promise<{ balance: number; balanceRaw: bigint }> {
  try {
    const response = await fetch(`${MOVEMENT_RPC}/accounts/${walletAddress}/resources`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { balance: 0, balanceRaw: BigInt(0) };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const resources = await response.json() as Array<{ type: string; data: unknown }>;
    const decimals = getDecimals(token.decimals);

    // For native MOVE token (AptosCoin)
    if (token.type === "0x1::aptos_coin::AptosCoin") {
      const coinStore = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      if (!coinStore) {
        return { balance: 0, balanceRaw: BigInt(0) };
      }
      const balanceRaw = BigInt((coinStore.data as { coin: { value: string } }).coin.value);
      const balance = Number(balanceRaw) / Math.pow(10, decimals);
      return { balance, balanceRaw };
    }

    // For fungible assets (check FungibleStore)
    if (token.isFungible && token.faAddress) {
      // Try to find the fungible asset store
      const faStore = resources.find((r) => {
        if (!r.type.includes("fungible_asset::FungibleStore")) return false;
        const data = r.data as { metadata?: { inner?: string } };
        // Check if metadata matches the token's FA address
        const metadataInner = data.metadata?.inner?.toLowerCase();
        const tokenFaAddress = token.faAddress?.replace("@", "0x").toLowerCase();
        return metadataInner === tokenFaAddress;
      });

      if (faStore) {
        const data = faStore.data as { balance: string };
        const balanceRaw = BigInt(data.balance || "0");
        const balance = Number(balanceRaw) / Math.pow(10, decimals);
        return { balance, balanceRaw };
      }
    }

    // For coin store tokens
    const coinStoreType = `0x1::coin::CoinStore<${token.type}>`;
    const coinStore = resources.find((r) => r.type === coinStoreType);
    if (coinStore) {
      const balanceRaw = BigInt((coinStore.data as { coin: { value: string } }).coin.value);
      const balance = Number(balanceRaw) / Math.pow(10, decimals);
      return { balance, balanceRaw };
    }

    return { balance: 0, balanceRaw: BigInt(0) };
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return { balance: 0, balanceRaw: BigInt(0) };
  }
}

export default function JouleLendForm({
  privateKey,
  address,
  onOperationComplete,
}: JouleLendFormProps) {
  const { pop, push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const amountRef = useRef<Form.TextField>(null);

  // Fetch balance when token changes
  useEffect(() => {
    if (selectedToken && address) {
      setIsLoadingBalance(true);
      fetchTokenBalance(address, selectedToken)
        .then(({ balance }) => {
          setTokenBalance(balance);
        })
        .catch((err) => {
          console.error("Failed to fetch balance:", err);
          setTokenBalance(0);
        })
        .finally(() => {
          setIsLoadingBalance(false);
        });
    } else {
      setTokenBalance(0);
    }
  }, [selectedToken, address]);

  // Handle token selection
  function handleTokenChange(tokenType: string) {
    const token = (tokenList as TokenData[]).find((t) => t.type === tokenType);
    setSelectedToken(token || null);
    setAmount(""); // Reset amount when token changes
  }

  // Set max amount
  function handleMaxAmount() {
    if (tokenBalance > 0) {
      // Leave a small buffer for gas if it's native MOVE
      const maxAmount = selectedToken?.type === "0x1::aptos_coin::AptosCoin" 
        ? Math.max(0, tokenBalance - 0.01) // Leave 0.01 MOVE for gas
        : tokenBalance;
      setAmount(maxAmount.toString());
    }
  }

  async function handleSubmit(values: {
    tokenType: string;
    positionId: string;
    amount: string;
    needToCreatePosition: string;
  }) {
    // Validate token selection
    if (!values.tokenType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Token Selected",
        message: "Please select a token to lend",
      });
      return;
    }

    // Find the selected token
    const token = (tokenList as TokenData[]).find((t) => t.type === values.tokenType);
    if (!token) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Token",
        message: "Selected token not found",
      });
      return;
    }

    const amountValue = parseFloat(values.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Amount",
        message: "Please enter a valid positive number",
      });
      return;
    }

    // Check if amount exceeds balance
    if (amountValue > tokenBalance) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Insufficient Balance",
        message: `You only have ${tokenBalance.toFixed(6)} ${token.displayName}`,
      });
      return;
    }

    if (!values.positionId || !values.positionId.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Position ID",
        message: "Please enter a valid position ID",
      });
      return;
    }

    setIsSubmitting(true);

    const needToCreatePosition = values.needToCreatePosition === "true";
    const decimals = getDecimals(token.decimals);

    // Build confirmation message
    const confirmMessage = `Lend ${amountValue} ${token.displayName} to position ${values.positionId.slice(0, 10)}...${needToCreatePosition ? " (creating new position)" : ""}`;

    // Confirm transaction
    const confirmed = await confirmAlert({
      title: "Confirm Lend",
      message: confirmMessage,
      primaryAction: {
        title: "Lend",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

    // Execute lend
    await showToast({ style: Toast.Style.Animated, title: `Lending ${token.displayName}...` });

    try {
      const result = await lendToken(
        privateKey,
        token.type, // T0 - the asset type
        amountValue,
        values.positionId,
        decimals,
        needToCreatePosition,
        "mainnet",
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Lending Successful!",
        message: `Hash: ${result.hash.slice(0, 10)}...`,
      });

      // Show success screen
      push(
        <LendSuccess
          amount={amountValue}
          tokenSymbol={token.displayName}
          address={address}
          hash={result.hash}
          assetType={token.type}
          positionId={result.positionId}
          onDone={() => {
            if (onOperationComplete) {
              onOperationComplete();
            }
            pop();
            pop();
          }}
        />,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Lending Failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format balance for display
  const balanceDisplay = isLoadingBalance 
    ? "Loading..." 
    : `${tokenBalance.toFixed(6)} ${selectedToken?.displayName || ""}`;

  return (
    <Form
      isLoading={isSubmitting || isLoadingBalance}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Lend Tokens" icon={Icon.Upload} onSubmit={handleSubmit} />
          {selectedToken && tokenBalance > 0 && (
            <Action 
              title="Use Max Amount" 
              icon={Icon.ArrowUp} 
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={handleMaxAmount} 
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Lend to Joule Finance"
        text={`From: ${formatAddress(address)}`}
      />

      <Form.Dropdown
        id="tokenType"
        title="Select Token"
        info="Choose the token you want to lend"
        onChange={handleTokenChange}
      >
        <Form.Dropdown.Item value="" title="Select a token..." />
        {(tokenList as TokenData[]).map((token) => (
          <Form.Dropdown.Item
            key={token.type}
            value={token.type}
            title={token.displayName}
            icon={token.icon}
          />
        ))}
      </Form.Dropdown>

      {selectedToken && (
        <>
          <Form.Description
            title="Token Info"
            text={`Provider: ${selectedToken.provider} | Decimals: ${getDecimals(selectedToken.decimals)} | LTV: ${selectedToken.ltv}%`}
          />
          <Form.Description
            title="Your Balance"
            text={balanceDisplay}
          />
        </>
      )}

      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="0.0"
        value={amount}
        onChange={setAmount}
        ref={amountRef}
        info={selectedToken 
          ? `Amount of ${selectedToken.displayName} to lend (Max: ${tokenBalance.toFixed(6)}). Press ⌘M for max.`
          : "Amount of tokens to lend"
        }
      />

      <Form.TextField
        id="positionId"
        title="Position ID"
        placeholder="Enter position ID"
        info="The Joule position ID to lend to"
      />

      <Form.Dropdown
        id="needToCreatePosition"
        title="Create New Position"
        defaultValue="false"
        info="Whether to create a new position or use existing one"
      >
        <Form.Dropdown.Item value="false" title="No - Use Existing Position" />
        <Form.Dropdown.Item value="true" title="Yes - Create New Position" />
      </Form.Dropdown>
    </Form>
  );
}

// Success screen component
function LendSuccess({
  amount,
  tokenSymbol,
  address,
  hash,
  assetType,
  positionId,
  onDone,
}: {
  amount: number;
  tokenSymbol: string;
  address: string;
  hash: string;
  assetType: string;
  positionId: string;
  onDone: () => void;
}) {
  const explorerUrl = getExplorerUrl("txn", hash, "mainnet");

  return (
    <Detail
      markdown={`# ✅ Lending Successful!

**Network:** Movement Mainnet

**Amount:** ${amount} ${tokenSymbol}

**Asset Type:**
\`${assetType}\`

**Position ID:** 
\`${positionId}\`

**Account:**
\`${address}\`

**Transaction Hash:**
\`${hash}\`

---

[View on Explorer](${explorerUrl})
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Explorer" url={explorerUrl} />
          <Action.CopyToClipboard title="Copy Transaction Hash" content={hash} />
          <Action.CopyToClipboard title="Copy Account Address" content={address} />
          <Action title="Done" onAction={onDone} />
        </ActionPanel>
      }
    />
  );
}

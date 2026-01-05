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
import { useState, useEffect } from "react";
import { supplyToEchelon } from "../../actions/echelon/lend";
import { formatAddress, getExplorerUrl } from "../../utils/aptos";
import echelonPools from "../../echelon-pools.json";

// Movement mainnet RPC endpoint
const MOVEMENT_RPC = "https://mainnet.movementnetwork.xyz/v1";

// Pool type from echelon-pools.json
interface EchelonPool {
  name: string;
  logo: string;
  address: string;
}

// Token decimals mapping
const TOKEN_DECIMALS: Record<string, number> = {
  "Move": 8,
  "USDC": 6,
  "USDT": 6,
  "WBTC": 8,
  "WETH": 8,
};

// Token metadata addresses (for fetching FA balances)
const TOKEN_METADATA: Record<string, string> = {
  "Move": "0xa", // Native MOVE
  "USDC": "0x83121c9f9b0527d1f056e21a950d6bf3b9e9e2e8353d0e95ccea726713cbea39",
  "USDT": "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d",
  "WBTC": "0xb06f29f24dde9c6daeec1f930f14a441a8d6c0fbea590725e88b340af3e1939c",
  "WETH": "0x908828f4fb0213d4034c3ded1630bbd904e8a3a6bf3c63270887f0b06653a376",
};

interface EchelonLendFormProps {
  privateKey: string;
  address: string;
  onOperationComplete?: () => void;
}

// Fetch token balance
async function fetchTokenBalance(
  walletAddress: string,
  tokenName: string,
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
    const decimals = TOKEN_DECIMALS[tokenName] || 8;

    // For native MOVE token
    if (tokenName === "Move") {
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

    // For fungible assets
    const tokenMetadata = TOKEN_METADATA[tokenName];
    if (tokenMetadata) {
      const faStore = resources.find((r) => {
        if (!r.type.includes("fungible_asset::FungibleStore")) return false;
        const data = r.data as { metadata?: { inner?: string } };
        const metadataInner = data.metadata?.inner?.toLowerCase();
        return metadataInner === tokenMetadata.toLowerCase();
      });

      if (faStore) {
        const data = faStore.data as { balance: string };
        const balanceRaw = BigInt(data.balance || "0");
        const balance = Number(balanceRaw) / Math.pow(10, decimals);
        return { balance, balanceRaw };
      }
    }

    return { balance: 0, balanceRaw: BigInt(0) };
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return { balance: 0, balanceRaw: BigInt(0) };
  }
}

export default function EchelonLendForm({
  privateKey,
  address,
  onOperationComplete,
}: EchelonLendFormProps) {
  const { pop, push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPool, setSelectedPool] = useState<EchelonPool | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [amount, setAmount] = useState<string>("");

  // Fetch balance when pool changes
  useEffect(() => {
    if (selectedPool && address) {
      setIsLoadingBalance(true);
      fetchTokenBalance(address, selectedPool.name)
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
  }, [selectedPool, address]);

  // Handle pool selection
  function handlePoolChange(poolAddress: string) {
    const pool = (echelonPools as EchelonPool[]).find((p) => p.address === poolAddress);
    setSelectedPool(pool || null);
    setAmount(""); // Reset amount when pool changes
  }

  // Set max amount
  function handleMaxAmount() {
    if (tokenBalance > 0 && selectedPool) {
      // Leave a small buffer for gas if it's native MOVE
      const maxAmount = selectedPool.name === "Move"
        ? Math.max(0, tokenBalance - 0.01)
        : tokenBalance;
      setAmount(maxAmount.toString());
    }
  }

  async function handleSubmit(values: {
    poolAddress: string;
    amount: string;
  }) {
    // Validate pool selection
    if (!values.poolAddress) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Pool Selected",
        message: "Please select a token pool to supply to",
      });
      return;
    }

    // Find the selected pool
    const pool = (echelonPools as EchelonPool[]).find((p) => p.address === values.poolAddress);
    if (!pool) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Pool",
        message: "Selected pool not found",
      });
      return;
    }

    const amountNum = parseFloat(values.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Amount",
        message: "Please enter a valid positive number",
      });
      return;
    }

    // Check if amount exceeds balance
    if (amountNum > tokenBalance) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Insufficient Balance",
        message: `You only have ${tokenBalance.toFixed(6)} ${pool.name}`,
      });
      return;
    }

    setIsSubmitting(true);

    const decimals = TOKEN_DECIMALS[pool.name] || 8;
    const amountInSmallestUnit = BigInt(Math.floor(amountNum * Math.pow(10, decimals)));
    const isMoveToken = pool.name === "Move";

    // Build confirmation message
    const confirmMessage = `Supply ${amountNum} ${pool.name} to Echelon?`;

    // Confirm transaction
    const confirmed = await confirmAlert({
      title: "Confirm Supply",
      message: confirmMessage,
      primaryAction: {
        title: "Supply",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

    // Execute supply
    await showToast({ style: Toast.Style.Animated, title: `Supplying ${pool.name}...` });

    try {
      const result = await supplyToEchelon(
        privateKey,
        pool.address,
        amountInSmallestUnit,
        isMoveToken,
        "mainnet",
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Supply Successful!",
        message: `Hash: ${result.hash.slice(0, 10)}...`,
      });

      // Show success screen
      push(
        <SupplySuccess
          amount={amountNum}
          tokenName={pool.name}
          poolAddress={pool.address}
          address={address}
          hash={result.hash}
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
        title: "Supply Failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format balance for display
  const balanceDisplay = isLoadingBalance
    ? "Loading..."
    : `${tokenBalance.toFixed(6)} ${selectedPool?.name || ""}`;

  return (
    <Form
      isLoading={isSubmitting || isLoadingBalance}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Supply to Echelon" icon={Icon.Upload} onSubmit={handleSubmit} />
          {selectedPool && tokenBalance > 0 && (
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
        title="Supply to Echelon"
        text={`Wallet: ${formatAddress(address)}`}
      />

      <Form.Dropdown
        id="poolAddress"
        title="Select Token"
        info="Choose the token you want to supply"
        onChange={handlePoolChange}
      >
        <Form.Dropdown.Item value="" title="Select a token..." />
        {(echelonPools as EchelonPool[]).map((pool) => (
          <Form.Dropdown.Item
            key={pool.address}
            value={pool.address}
            title={pool.name}
            icon={pool.logo}
          />
        ))}
      </Form.Dropdown>

      {selectedPool && (
        <>
          <Form.Description
            title="Pool Address"
            text={selectedPool.address}
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
        info={selectedPool
          ? `Amount of ${selectedPool.name} to supply (Max: ${tokenBalance.toFixed(6)}). Press ⌘M for max.`
          : "Amount of tokens to supply"
        }
      />
    </Form>
  );
}

// Success screen component
function SupplySuccess({
  amount,
  tokenName,
  poolAddress,
  address,
  hash,
  onDone,
}: {
  amount: number;
  tokenName: string;
  poolAddress: string;
  address: string;
  hash: string;
  onDone: () => void;
}) {
  const explorerUrl = getExplorerUrl("txn", hash, "mainnet");

  return (
    <Detail
      markdown={`# ✅ Supply Successful!

**Network:** Movement Mainnet

**Amount:** ${amount} ${tokenName}

**Pool Address:**
\`${poolAddress}\`

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


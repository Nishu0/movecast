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
import { useState } from "react";
import { borrowToken } from "../../actions/joule/borrow";
import { formatAddress, getExplorerUrl } from "../../utils/aptos";
import tokenList from "../../token.json";

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

interface JouleBorrowFormProps {
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

export default function JouleBorrowForm({
  privateKey,
  address,
  onOperationComplete,
}: JouleBorrowFormProps) {
  const { pop, push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);

  // Handle token selection
  function handleTokenChange(tokenType: string) {
    const token = (tokenList as TokenData[]).find((t) => t.type === tokenType);
    setSelectedToken(token || null);
  }

  async function handleSubmit(values: {
    tokenType: string;
    positionId: string;
    amount: string;
  }) {
    // Validate token selection
    if (!values.tokenType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Token Selected",
        message: "Please select a token to borrow",
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

    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Amount",
        message: "Please enter a valid positive number",
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

    const decimals = getDecimals(token.decimals);

    // Build confirmation message
    const confirmMessage = `Borrow ${amount} ${token.displayName} from position ${values.positionId}?`;

    // Confirm transaction
    const confirmed = await confirmAlert({
      title: "Confirm Borrow",
      message: confirmMessage,
      primaryAction: {
        title: "Borrow",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

    // Execute borrow
    await showToast({ style: Toast.Style.Animated, title: `Borrowing ${token.displayName}...` });

    try {
      const result = await borrowToken(
        privateKey,
        token.type, // T0 - the asset type
        amount,
        values.positionId,
        decimals,
        "mainnet",
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Borrowing Successful!",
        message: `Hash: ${result.hash.slice(0, 10)}...`,
      });

      // Show success screen
      push(
        <BorrowSuccess
          amount={amount}
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
        title: "Borrowing Failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Borrow Tokens" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Borrow from Joule Finance"
        text={`To: ${formatAddress(address)}`}
      />

      <Form.Dropdown
        id="tokenType"
        title="Select Token"
        info="Choose the token you want to borrow"
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
        <Form.Description
          title="Token Info"
          text={`Provider: ${selectedToken.provider} | Decimals: ${getDecimals(selectedToken.decimals)} | LTV: ${selectedToken.ltv}%`}
        />
      )}

      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="0.0"
        info={selectedToken 
          ? `Amount of ${selectedToken.displayName} to borrow`
          : "Amount of tokens to borrow"
        }
      />

      <Form.TextField
        id="positionId"
        title="Position ID"
        placeholder="Enter position ID"
        info="The Joule position ID to borrow from"
      />
    </Form>
  );
}

// Success screen component
function BorrowSuccess({
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
      markdown={`# ✅ Borrowing Successful!

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

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
import { swapWithPayload, MeridianPayload } from "../../actions/meridian/swap";
import { formatAddress, getExplorerUrl } from "../../utils/aptos";

interface MeridianSwapFormProps {
  privateKey: string;
  address: string;
  onOperationComplete?: () => void;
}

export default function MeridianSwapForm({
  privateKey,
  address,
  onOperationComplete,
}: MeridianSwapFormProps) {
  const { pop, push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payloadJson, setPayloadJson] = useState<string>("");

  async function handleSubmit(values: { payloadJson: string }) {
    // Validate payload
    if (!values.payloadJson || !values.payloadJson.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Payload Provided",
        message: "Please paste the swap payload from Meridian",
      });
      return;
    }

    let payload: MeridianPayload;
    try {
      const parsed = JSON.parse(values.payloadJson);
      // Handle both wrapped and unwrapped formats
      payload = parsed.payload || parsed;
      
      // Validate payload structure
      if (!payload.functionArguments || !Array.isArray(payload.functionArguments)) {
        throw new Error("Invalid payload structure - missing functionArguments");
      }
      if (payload.functionArguments.length < 5) {
        throw new Error("Invalid payload - functionArguments must have 5 elements");
      }
      if (!payload.typeArguments || !Array.isArray(payload.typeArguments)) {
        throw new Error("Invalid payload structure - missing typeArguments");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: error instanceof Error ? error.message : "Please check the payload format",
      });
      return;
    }

    setIsSubmitting(true);

    // Extract info for confirmation
    const pools = payload.functionArguments[0];
    const amountIn = payload.functionArguments[2];
    const outputToken = payload.functionArguments[3];
    const minAmountOut = payload.functionArguments[4];
    const inputTokenType = payload.typeArguments[0];

    // Build confirmation message
    const confirmMessage = `Execute swap?\n\nAmount In: ${amountIn}\nOutput Token: ${outputToken.slice(0, 10)}...\nMin Out: ${minAmountOut}\nPools: ${pools.length} hops`;

    // Confirm transaction
    const confirmed = await confirmAlert({
      title: "Confirm Meridian Swap",
      message: confirmMessage,
      primaryAction: {
        title: "Swap",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

    // Execute swap
    await showToast({ style: Toast.Style.Animated, title: "Executing swap..." });

    try {
      const result = await swapWithPayload(privateKey, payload, "mainnet");

      await showToast({
        style: Toast.Style.Success,
        title: "Swap Successful!",
        message: `Hash: ${result.hash.slice(0, 10)}...`,
      });

      // Show success screen
      push(
        <SwapSuccess
          amountIn={amountIn}
          inputTokenType={inputTokenType}
          outputToken={outputToken}
          minAmountOut={minAmountOut}
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
        title: "Swap Failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const examplePayload = `{
  "payload": {
    "function": "0xc36ceb...::router::swap_exact_in_router_entry",
    "functionArguments": [
      ["pool1", "pool2", "pool3"],
      ["token1", "token2", "token3"],
      20000000,
      "0xa",
      7808
    ],
    "typeArguments": ["0x1::aptos_coin::AptosCoin"]
  }
}`;

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Swap" icon={Icon.ArrowRightCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Swap on Meridian DEX"
        text={`Wallet: ${formatAddress(address)}`}
      />

      <Form.Description
        title="How to use"
        text="1. Go to Meridian DEX (app.meridian.exchange)\n2. Set up your swap and get the quote\n3. Copy the payload JSON from browser DevTools\n4. Paste it below and execute"
      />

      <Form.TextArea
        id="payloadJson"
        title="Swap Payload (JSON)"
        placeholder={examplePayload}
        value={payloadJson}
        onChange={setPayloadJson}
        info="Paste the full swap payload from Meridian's quote response"
      />
    </Form>
  );
}

// Success screen component
function SwapSuccess({
  amountIn,
  inputTokenType,
  outputToken,
  minAmountOut,
  address,
  hash,
  onDone,
}: {
  amountIn: number;
  inputTokenType: string;
  outputToken: string;
  minAmountOut: number;
  address: string;
  hash: string;
  onDone: () => void;
}) {
  const explorerUrl = getExplorerUrl("txn", hash, "mainnet");

  return (
    <Detail
      markdown={`# ✅ Swap Successful!

**Network:** Movement Mainnet

**Amount In:** ${amountIn} (smallest unit)

**Input Token:** 
\`${inputTokenType}\`

**Output Token:** 
\`${outputToken}\`

**Min Amount Out:** ${minAmountOut}

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

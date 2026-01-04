import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  PrivateKey,
  PrivateKeyVariants,
  Network,
} from "@aptos-labs/ts-sdk";
import { LocalStorage } from "@raycast/api";
import { NetworkType } from "../type";
import {
  EXPLORER_BASE_URL,
  DEFAULT_NETWORK,
  ADDRESS_TRUNCATE_START,
  ADDRESS_TRUNCATE_END,
} from "../utils/constants";

// Re-export NetworkType for backwards compatibility
export type { NetworkType } from "../type";

// Movement Network RPC URLs
const MOVEMENT_RPC_URLS: Record<NetworkType, string> = {
  mainnet: "https://mainnet.movementnetwork.xyz/v1",
  testnet: "https://testnet.movementnetwork.xyz/v1",
  devnet: "https://devnet.movementnetwork.xyz/v1",
};

// ============ NETWORK HELPERS ============

// Get the RPC URL for the specified network
function getNetworkUrl(network: NetworkType): string {
  return MOVEMENT_RPC_URLS[network] || MOVEMENT_RPC_URLS.mainnet;
}

// Get the currently selected network from LocalStorage
export async function getSelectedNetwork(): Promise<NetworkType> {
  const network = await LocalStorage.getItem<string>("network");
  return (network as NetworkType) || DEFAULT_NETWORK;
}

// Set the selected network in LocalStorage
export async function setSelectedNetwork(network: NetworkType): Promise<void> {
  await LocalStorage.setItem("network", network);
}

// ============ CLIENT HELPERS ============

// Get Aptos client for the specified network (read-only operations)
export function getClient(network: NetworkType): Aptos {
  const fullnodeUrl = getNetworkUrl(network);
  console.log(`[Aptos] Creating client for network: ${network}, URL: ${fullnodeUrl}`);
  
  const config = new AptosConfig({
    fullnode: fullnodeUrl,
    network: Network.CUSTOM,
  });
  return new Aptos(config);
}

// Get Aptos client with account for transactions
export function getClientWithAccount(network: NetworkType, account: Account): Aptos {
  const fullnodeUrl = getNetworkUrl(network);
  console.log(`[Aptos] Creating client with account for network: ${network}, URL: ${fullnodeUrl}`);
  
  const config = new AptosConfig({
    fullnode: fullnodeUrl,
    network: Network.CUSTOM,
  });
  return new Aptos(config);
}

// Get Explorer URL for the specified network
export function getExplorerUrl(type: "account" | "txn" | "fungible_asset", hash: string, network: NetworkType): string {
  return `${EXPLORER_BASE_URL}/${type}/${hash}?network=${network}`;
}

// ============ ACCOUNT HELPERS ============

// Create an Account object from a private key string
export function getAccountFromPrivateKey(privateKeyHex: string): Account {
  console.log(`[Aptos] Creating account from private key (length: ${privateKeyHex.length})`);
  const privateKey = new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyHex, PrivateKeyVariants.Ed25519));
  const account = Account.fromPrivateKey({ privateKey });
  console.log(`[Aptos] Account address: ${account.accountAddress.toString()}`);
  return account;
}

// Format address for display (truncate middle)
export function formatAddress(address: string): string {
  const minLength = ADDRESS_TRUNCATE_START + ADDRESS_TRUNCATE_END + 3;
  if (address.length <= minLength) return address;
  return `${address.slice(0, ADDRESS_TRUNCATE_START)}...${address.slice(-ADDRESS_TRUNCATE_END)}`;
}

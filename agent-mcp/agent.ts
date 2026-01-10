import type { AccountAddress, MoveStructId } from "@aptos-labs/ts-sdk"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import { AptosPriceServiceConnection } from "@pythnetwork/pyth-aptos-js"
import { priceFeed } from "./constants/price-feeds"
import type { BaseSigner } from "./signers"

import {
	getBalance,
	getTokenDetails,
	getTokenPrice,
	transferTokens,
} from "./tools/move/index"

import { 
lendToken
} from "./tools/joule/lend"



// Movement Network mainnet RPC URL
const MOVEMENT_MAINNET_RPC = "https://mainnet.movementnetwork.xyz/v1"

export interface AgentConfig {
	network: "mainnet" | "testnet" | "devnet"
	fullnode?: string
	faucet?: string
	indexer?: string
}

export class AgentRuntime {
	public account: BaseSigner
	public aptos: Aptos
	public config: AgentConfig

	constructor(account: BaseSigner, aptos: Aptos, config?: AgentConfig) {
		this.account = account
		this.aptos = aptos
		this.config = config ? config : {
			network: "mainnet",
			fullnode: MOVEMENT_MAINNET_RPC,
		}
	}

    getBalance(mint?: string | MoveStructId) {
		return getBalance(this, mint)
	}

    getTokenDetails(token: string) {
		return getTokenDetails(token)
	}

    getTokenPrice(query: string) {
		return getTokenPrice(query)
	}

    transferTokens(to: AccountAddress, amount: number, mint: string) {
		return transferTokens(this, to, amount, mint)
	}

    lendToken(amount: number, mint: MoveStructId, positionId: string, newPosition: boolean, fungibleAsset: boolean) {
		return lendToken(this, amount, mint, positionId, newPosition, fungibleAsset)
	}


	async getPythData() {
		const connection = new AptosPriceServiceConnection("https://hermes.pyth.network")

		return await connection.getPriceFeedsUpdateData(priceFeed)
	}
}
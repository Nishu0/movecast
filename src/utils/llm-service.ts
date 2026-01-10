import OpenAI from "openai";
import { config } from "../config";

// Available backend actions with their descriptions
const AVAILABLE_ACTIONS = [
  {
    method: "getWalletAddress",
    description: "Get the user's Movement wallet address",
    params: {},
    keywords: ["wallet", "address", "my wallet", "wallet address"],
  },
  {
    method: "getMoveBalance",
    description: "Get MOVE token balance for the user's wallet",
    params: {},
    keywords: ["balance", "move balance", "how much move", "move tokens"],
  },
  {
    method: "getPortfolio",
    description: "Get the user's complete token portfolio with balances and values",
    params: {},
    keywords: ["portfolio", "holdings", "tokens", "assets", "what do i have", "my tokens"],
  },
  {
    method: "getToken",
    description: "Get detailed information about a specific token by address or symbol",
    params: {
      tokenId: "Token address or symbol (e.g., 'SOL', 'USDC', or full address)",
    },
    keywords: ["token info", "token details", "price of", "token price", "what is"],
  },
  {
    method: "getTokenDataByTicker",
    description: "Get token data by ticker symbol",
    params: {
      ticker: "Token ticker symbol (e.g., 'SOL', 'USDC')",
    },
    keywords: ["ticker", "symbol", "token symbol"],
  },
  {
    method: "getTokenList",
    description: "Get list of all available Movement tokens",
    params: {},
    keywords: ["token list", "all tokens", "available tokens", "tokens list"],
  },
  {
    method: "getWalletCredentials",
    description: "Get wallet credentials (address and private key) - use with caution",
    params: {},
    keywords: ["credentials", "private key", "wallet credentials"],
  },
];

export interface ActionMapping {
  method: string;
  params: Record<string, string | number>;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * Uses OpenAI to map natural language query to backend action
 */
export async function mapQueryToAction(query: string, openaiApiKey?: string): Promise<ActionMapping> {
  // Use config file first, then environment variable, then passed key
  const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || openaiApiKey;

  if (!apiKey) {
    throw new Error("OpenAI API key not found. Set OPENAI_API_KEY in config.ts or configure in preferences.");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const systemPrompt = `You are an AI assistant that maps user queries to backend API actions for a Move blockchain wallet application.

Available actions:
${JSON.stringify(AVAILABLE_ACTIONS, null, 2)}

Your task:
1. Analyze the user's query
2. Determine which action best matches their intent
3. Extract any required parameters from the query
4. Return a JSON object with: method, params, confidence ("high"/"medium"/"low"), and reasoning

Examples:
- Query: "what is my portfolio" -> {"method": "getPortfolio", "params": {}, "confidence": "high", "reasoning": "User wants to see their complete token portfolio"}
- Query: "price of SOL" -> {"method": "getToken", "params": {"tokenId": "SOL"}, "confidence": "high", "reasoning": "User wants token information for SOL"}
- Query: "my wallet address" -> {"method": "getWalletAddress", "params": {}, "confidence": "high", "reasoning": "User wants their wallet address"}
- Query: "show me all tokens" -> {"method": "getTokenList", "params": {}, "confidence": "high", "reasoning": "User wants to see all available tokens"}

Return ONLY valid JSON, no additional text.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: query,
      },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  });

  const responseText = completion.choices[0]?.message?.content || "";

  try {
    // Extract JSON from response (handle cases where Claude adds explanation)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const mapping: ActionMapping = JSON.parse(jsonMatch[0]);

    // Validate the mapping
    if (!mapping.method || !AVAILABLE_ACTIONS.find((a) => a.method === mapping.method)) {
      throw new Error(`Invalid method: ${mapping.method}`);
    }

    return mapping;
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    throw new Error(`Failed to understand query: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Formats API response data as markdown for display
 */
export async function formatResponseAsMarkdown(
  method: string,
  data: unknown,
  openaiApiKey?: string,
): Promise<string> {
  // Use config file first, then environment variable, then passed key
  const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || openaiApiKey;

  if (!apiKey) {
    throw new Error("OpenAI API key not found. Set OPENAI_API_KEY in config.ts or configure in preferences.");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const systemPrompt = `You are an AI assistant that formats blockchain wallet data into clear, user-friendly markdown.

Your task:
1. Take the API response data
2. Format it as clean, well-organized markdown
3. Use tables for structured data (like portfolios)
4. Use bullet points for lists
5. Highlight important information (wallet addresses, total values, etc.)
6. Be concise and easy to read

Guidelines:
- For portfolio data: Use a table with columns for Token, Symbol, Balance, Price, Value
- For wallet addresses: Format clearly with label
- For token prices: Show current price with symbol
- For balances: Include token symbol
- Always format numbers nicely (use comma separators for large numbers)
- Keep it professional and clear`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Format this ${method} API response as markdown:\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
    max_tokens: 2048,
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "No response generated";
}

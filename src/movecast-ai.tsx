import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { withAccessToken } from "@raycast/utils";
import { provider, executeAction, createErrorToast } from "./utils";
import { mapQueryToAction, formatResponseAsMarkdown, type ActionMapping } from "./utils/llm-service";
import { config } from "./config";

interface Preferences {
  openaiApiKey: string;
}

function MovecastAI() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedAction, setDetectedAction] = useState<ActionMapping | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  async function handleQuery(query: string) {
    if (!query.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResponse(null);
      setDetectedAction(null);

      // Check if API key is configured (config file, env var, or preferences)
      const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || preferences.openaiApiKey;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in config.ts or extension preferences.");
      }

      // Step 1: Map query to action using LLM
      await showToast({
        style: Toast.Style.Animated,
        title: "Understanding your query...",
      });

      const actionMapping = await mapQueryToAction(query, apiKey);
      setDetectedAction(actionMapping);

      // Step 2: Execute the backend action
      await showToast({
        style: Toast.Style.Animated,
        title: `Executing: ${actionMapping.method}`,
      });

      const result = await executeAction(actionMapping.method, actionMapping.params);

      // Step 3: Format the response
      await showToast({
        style: Toast.Style.Animated,
        title: "Formatting response...",
      });

      const formattedResponse = await formatResponseAsMarkdown(
        actionMapping.method,
        result.data,
        apiKey,
      );

      setResponse(formattedResponse);

      await showToast({
        style: Toast.Style.Success,
        title: "Done!",
      });
    } catch (err) {
      console.error("AI query error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process query";
      setError(errorMessage);
      await showToast(createErrorToast("Error", err, "Failed to process query"));
    } finally {
      setIsLoading(false);
    }
  }

  // If we have a response, show it in Detail view
  if (response || error) {
    const markdown = error
      ? `# Error\n\n${error}\n\n*Try rephrasing your question or check your API key configuration.*`
      : `${response}`;

    return (
      <Detail
        markdown={markdown}
        navigationTitle="Movecast AI"
        metadata={
          detectedAction && !error ? (
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Action"
                text={detectedAction.method}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              />
              <Detail.Metadata.Label title="Confidence" text={detectedAction.confidence} />
              {detectedAction.reasoning && <Detail.Metadata.Label title="Reasoning" text={detectedAction.reasoning} />}
            </Detail.Metadata>
          ) : undefined
        }
        actions={
          <ActionPanel>
            <Action
              title="New Query"
              icon={Icon.ArrowLeft}
              onAction={() => {
                setResponse(null);
                setError(null);
                setDetectedAction(null);
              }}
            />
            <Action.CopyToClipboard
              title="Copy Response"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Search view with example queries
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Ask anything about your wallet, portfolio, or tokens..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
    >
      {!searchText && (
        <>
          <List.Section title="Try asking">
            <List.Item
              title="What is my portfolio?"
              subtitle="Get your complete token portfolio"
              icon={Icon.Wallet}
              actions={
                <ActionPanel>
                  <Action title="Ask" onAction={() => handleQuery("What is my portfolio?")} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Show my wallet address"
              subtitle="Get your Movement wallet address"
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action title="Ask" onAction={() => handleQuery("Show my wallet address")} />
                </ActionPanel>
              }
            />
            <List.Item
              title="What's the price of MOVE?"
              subtitle="Get token information and price"
              icon={Icon.Coins}
              actions={
                <ActionPanel>
                  <Action title="Ask" onAction={() => handleQuery("What's the price of MOVE?")} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Show all available tokens"
              subtitle="Get list of Movement tokens"
              icon={Icon.List}
              actions={
                <ActionPanel>
                  <Action title="Ask" onAction={() => handleQuery("Show all available tokens")} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}

      {searchText && (
        <List.Item
          title={`Ask: "${searchText}"`}
          subtitle="Press Enter to submit your question"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Submit Query" icon={Icon.ArrowRight} onAction={() => handleQuery(searchText)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default withAccessToken(provider)(MovecastAI);

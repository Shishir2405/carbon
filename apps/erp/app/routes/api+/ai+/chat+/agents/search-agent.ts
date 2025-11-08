import { openai } from "@ai-sdk/openai";
import { webSearchTool } from "../tools/web-search";
import { purchasingAgent } from "./purchasing-agent";
import { createAgent } from "./shared/agent";
import { COMMON_AGENT_RULES, formatContextForLLM } from "./shared/prompts";

export const searchAgent = createAgent({
  name: "general",
  model: openai("gpt-4o"),
  temperature: 0.8,
  instructions: (ctx) => `You are a helpful assistant for ${
    ctx.companyName
  }. Handle general questions and web searches.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<capabilities>
- Answer simple questions directly
- Use webSearch for current information, news, external data
- Route to specialists for business-specific data
</capabilities>`,
  tools: {
    webSearch: webSearchTool,
  },
  handoffs: [purchasingAgent],
  maxTurns: 5,
});

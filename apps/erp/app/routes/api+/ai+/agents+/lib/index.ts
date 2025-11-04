import { Agent, type AgentConfig } from "@ai-sdk-tools/agents";
import { UpstashProvider } from "@ai-sdk-tools/memory/upstash";
import { openai } from "@ai-sdk/openai";
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "@carbon/auth";
import { Redis } from "@upstash/redis";
import PROFILE_PROMPT from "./profile.txt?raw";
import SUGGESTIONS_INSTRUCTIONS from "./suggestions.txt?raw";
import TITLE_INSTRUCTIONS from "./title.txt?raw";

export function formatContextForLLM(context: AppContext): string {
  return `<company_info>
<current_date>${context.currentDateTime}</current_date>
<timezone>${context.timezone}</timezone>
<company_name>${context.companyName}</company_name>
<base_currency>${context.baseCurrency}</base_currency>
<locale>${context.locale}</locale>
</company_info>

Important: Use the current date/time above for time-sensitive operations. User-specific information is maintained in your working memory.`;
}

export const COMMON_AGENT_RULES = `<behavior_rules>
- Call tools immediately without explanatory text
- Use parallel tool calls when possible
- Provide specific numbers and actionable insights
- Explain your reasoning
- Lead with the most important information first
- When presenting repeated structured data (lists of items, multiple entries, time series), always use markdown tables
- Tables make data scannable and easier to compare - use them for any data with 2+ rows
</behavior_rules>`;

export interface AppContext {
  userId: string;
  fullName: string;
  companyName: string;
  baseCurrency: string;
  locale: string;
  currentDateTime: string;
  country?: string;
  city?: string;
  timezone: string;
  chatId: string;
  // Allow additional properties to satisfy Record<string, unknown> constraint
  [key: string]: unknown;
}

export function createAppContext(params: {
  userId: string;
  fullName: string;
  companyName: string;
  country?: string;
  city?: string;
  chatId: string;
  baseCurrency?: string;
  locale?: string;
  timezone?: string;
  teamId?: string;
}) {
  return {
    userId: params.userId,
    fullName: params.fullName,
    companyName: params.companyName,
    country: params.country,
    city: params.city,
    chatId: params.chatId,
    baseCurrency: params.baseCurrency || "USD",
    locale: params.locale || "en-US",
    currentDateTime: new Date().toISOString(),
    timezone:
      params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    teamId: params.teamId,
  };
}

export const memoryProvider = new UpstashProvider(
  new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  })
);

export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    modelSettings: {
      parallel_tool_calls: true,
    },
    ...config,
    memory: {
      provider: memoryProvider,
      history: {
        enabled: true,
        limit: 10,
      },
      workingMemory: {
        enabled: true,
        template: PROFILE_PROMPT,
        scope: "user",
      },
      chats: {
        enabled: true,
        generateTitle: {
          model: openai("gpt-4.1-nano"),
          instructions: TITLE_INSTRUCTIONS,
        },
        generateSuggestions: {
          enabled: true,
          model: openai("gpt-4.1-nano"),
          limit: 5,
          instructions: SUGGESTIONS_INSTRUCTIONS,
        },
      },
    },
  });
};
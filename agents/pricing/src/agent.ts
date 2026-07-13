import { AgentTool, LlmAgent, GOOGLE_SEARCH } from '@google/adk';
import { getOurPriceTool } from './tools.ts';

// TODO(workshop): Build the pricing agent.
//
// It should compare TechParts' own price against the current market:
// - get_our_price gives our price (already wired below).
// - For market prices you need web search. The built-in GOOGLE_SEARCH tool
//   can't live in the same `tools` array as a function tool, so the ADK pattern
//   is to put GOOGLE_SEARCH on its own small LlmAgent and expose that agent here
//   via AgentTool. Build that market-research sub-agent and add it to `tools`.
//   (See the slides on built-in tools and AgentTool composition.)
//
// Then write an `instruction` that always fetches our price AND researches the
// market, compares them, and states clearly whether we're cheaper / in line /
// more expensive.

const marketResearchAgent = new LlmAgent({
  name: 'market_research',
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  description: 'Market research sub-agent: searches the web for competitor prices and availability using GOOGLE_SEARCH.',
  instruction: `You are a market-research assistant. Use the built-in GOOGLE_SEARCH tool to find recent retailer prices for the queried product.
Return a concise list of retailers and prices (retailer, price) and a one-line summary of the typical street price.`,
  tools: [GOOGLE_SEARCH],
});

export const rootAgent = new LlmAgent({
  name: 'pricing_agent',
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  description: "Pricing specialist: returns TechParts' own price and compares it to the market.",
  instruction: [
      'You are the TechParts pricing agent. For every product query:',
      '1) Fetch our price via the `get_our_price` tool (do this first).',
      '2) Run market research by calling the `market_research` tool with the same SKU or product name.',
      '3) Compare ourPrice to the competitor prices and conclude one of: "cheaper", "in line", or "more expensive", with a short numeric delta (approx).',
      '4) Be concise and factual: include our SKU, product name, ourPrice, a short list of competitor prices (retailer: price), and the conclusion.',
      'Rules: never invent prices or retailer names; always cite tool results; if a tool returns an error, surface it and stop.',
    ].join('\n'),
  tools: [getOurPriceTool, new AgentTool({ agent: marketResearchAgent })],
});

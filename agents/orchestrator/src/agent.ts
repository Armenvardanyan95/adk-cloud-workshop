import { AgentTool, LlmAgent, RemoteA2AAgent  } from '@google/adk';

const INVENTORY_URL = process.env.INVENTORY_AGENT_URL ?? 'http://localhost:8001';
const ORDERS_URL = process.env.ORDERS_AGENT_URL ?? 'http://localhost:8002';
const PRICING_URL = process.env.PRICING_AGENT_URL ?? 'http://localhost:8003';

// TODO(workshop): Build the orchestrator.
//
// The orchestrator has no tools or data of its own — it coordinates the three
// worker agents, each running as its own service, over the A2A protocol:
// - For each worker, create a RemoteA2AAgent whose `agentCard` is the worker's
//   base URL (use the constants above). Give each a clear `description` so the
//   orchestrator knows when to delegate to it.
// - Wrap each RemoteA2AAgent in an AgentTool and add them to `tools` below.
// - Write an `instruction` that breaks a case into sub-questions, delegates each
//   to the right specialist (passing all needed context, since the specialists
//   don't see this conversation), and synthesizes one recommendation.
//   (See the slides on A2A, RemoteA2AAgent and AgentTool.)

const inventoryAgent = new RemoteA2AAgent({
  name: 'inventory_agent',
  description:
    'Catalog and stock specialist: finds products, prices, and current stock/warehouse info.',
  agentCard: INVENTORY_URL,
});

const ordersAgent = new RemoteA2AAgent({
  name: 'orders_agent',
  description:
    'Order history and return-policy specialist: looks up customer orders, order details, and return eligibility.',
  agentCard: ORDERS_URL,
});

const pricingAgent = new RemoteA2AAgent({
  name: 'pricing_agent',
  description:
    "Pricing specialist: returns TechParts' price for a product and can run market research (via its sub-agent).",
  agentCard: PRICING_URL,
});

export const rootAgent = new LlmAgent({
  name: 'ops_orchestrator',
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  description: 'Orchestrator that coordinates inventory, orders and pricing specialists for support cases.',
  instruction: [
    'You are the TechParts operations orchestrator. For each user request:',
    '1) Decompose the request into concrete sub-questions (include IDs, SKUs or product names).',
    '2) Call the right specialist as a tool with a single, self-contained natural-language prompt that contains all context they need.',
    '   - Use the Orders tool to fetch customer orders or order details and to check return eligibility.',
    '   - Use the Inventory tool to search products and check stock; prefer in-stock alternatives when recommending replacements.',
    "   - Use the Pricing tool to fetch our price (and optionally market research via its sub-agent).",
    '3) Synthesize a single concise recommendation for the support agent: key facts, eligibility, suggested replacement(s) with stock+price, and next actions.',
    'Rules: never invent data; always use tool responses; if a tool reports a blocker (e.g. return window expired), include that as the primary fact and propose a mitigator.',
  ].join('\n'),
  tools: [
    new AgentTool({ agent: inventoryAgent }),
    new AgentTool({ agent: ordersAgent }),
    new AgentTool({ agent: pricingAgent }),
  ],
});

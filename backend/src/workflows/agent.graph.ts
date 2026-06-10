/**
 * agent.graph.ts
 *
 * Assembles the FrontDeskOS Conversation Agent as a LangGraph StateGraph.
 *
 * Graph topology:
 *
 *   START
 *     │
 *     ▼
 *  intentDetector ──(conditional)──► greetingNode
 *                                  ► informationNode
 *                                  ► pricingNode
 *                                  ► bookingNode
 *                                  ► rescheduleNode
 *                                  ► cancellationNode
 *                                  ► escalationNode   (handles escalation + human_request)
 *                                  ► unknownNode
 *                                  │
 *                                  └──► END
 *
 * The graph is compiled ONCE at module load and reused across all requests.
 * Invocations are stateless at the graph level — all context is injected per-call.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation, AgentState } from './agent.state';
import { INTENT_TO_NODE } from './agent.prompts';
import {
  detectIntentNode,
  informationNode,
  pricingNode,
  bookingNode,
  rescheduleNode,
  cancellationNode,
  escalationNode,
  greetingNode,
  unknownNode,
  leadCaptureNode,
} from './agent.nodes';

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the classified intent from state and returns the name of the target handler node.
 * This is the conditional edge from detectIntentNode to the appropriate handler.
 * Falls back to 'unknownNode' for any unmapped or null intent so the graph never crashes.
 */
function routeByIntent(state: AgentState): string {
  const nodeName = INTENT_TO_NODE[state.intent] || 'unknownNode';
  console.log(`🔀 Routing intent "${state.intent}" → ${nodeName}`);
  return nodeName;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

const graph = new StateGraph(AgentStateAnnotation)
  // Register all nodes
  .addNode('intentDetector', detectIntentNode)
  .addNode('informationNode', informationNode)
  .addNode('pricingNode', pricingNode)
  .addNode('bookingNode', bookingNode)
  .addNode('rescheduleNode', rescheduleNode)
  .addNode('cancellationNode', cancellationNode)
  .addNode('escalationNode', escalationNode)
  .addNode('greetingNode', greetingNode)
  .addNode('unknownNode', unknownNode)
  .addNode('leadCaptureNode', leadCaptureNode)

  // Entry point
  .addEdge(START, 'intentDetector')

  // Conditional routing after intent detection
  .addConditionalEdges(
    'intentDetector',
    routeByIntent,
    {
      // Map node names to actual node references (LangGraph route map)
      greetingNode: 'greetingNode',
      informationNode: 'informationNode',
      pricingNode: 'pricingNode',
      bookingNode: 'bookingNode',
      rescheduleNode: 'rescheduleNode',
      cancellationNode: 'cancellationNode',
      escalationNode: 'escalationNode',
      unknownNode: 'unknownNode',
      leadCaptureNode: 'leadCaptureNode',
    }
  )

  // All handler nodes terminate the graph
  .addEdge('informationNode', END)
  .addEdge('pricingNode', END)
  .addEdge('bookingNode', END)
  .addEdge('rescheduleNode', END)
  .addEdge('cancellationNode', END)
  .addEdge('escalationNode', END)
  .addEdge('greetingNode', END)
  .addEdge('unknownNode', END)
  .addEdge('leadCaptureNode', END);

// Compile the graph once at module load time
export const conversationAgent = graph.compile();

export default conversationAgent;

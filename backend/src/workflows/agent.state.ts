/**
 * agent.state.ts
 *
 * Defines the shared state object that flows through the LangGraph StateGraph.
 * Every node reads from and writes to this state. LangGraph uses annotation
 * reducers to merge partial updates returned from each node.
 */

import { Annotation } from '@langchain/langgraph';
import {
  Business,
  Customer,
  Conversation,
  Message,
  Service,
  ConversationIntent,
  CustomerLifecycleState,
} from '../types';

/**
 * AgentState is the central data structure for the conversation agent.
 * Each field is annotated with a reducer strategy:
 *  - `default` (replace): latest write wins — used for intent, reply, etc.
 *  - `(a, b) => b ?? a`: null-safe replace — only update when value is provided.
 */
export const AgentStateAnnotation = Annotation.Root({
  // ── Input context ──────────────────────────────────────────────
  /** The raw message content sent by the customer. */
  userMessage: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  /** The customer profile resolved from the database. */
  customer: Annotation<Customer>({
    reducer: (_prev, next) => next,
    default: () => ({} as Customer),
  }),

  /** The active conversation session. */
  conversation: Annotation<Conversation>({
    reducer: (_prev, next) => next,
    default: () => ({} as Conversation),
  }),

  /** The business profile, including FAQs, services, and settings. */
  business: Annotation<Business>({
    reducer: (_prev, next) => next,
    default: () => ({} as Business),
  }),

  /** The list of services offered by the business. */
  services: Annotation<Service[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  /** Full conversation history (last N messages) for context injection. */
  history: Annotation<Message[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // ── Agent-produced outputs ─────────────────────────────────────
  /** The classified intent of the current customer message. */
  intent: Annotation<ConversationIntent>({
    reducer: (_prev, next) => next,
    default: () => 'unknown',
  }),

  /** Confidence score (0–1) from the intent classifier, for logging. */
  intentConfidence: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),

  /** The final reply text to send back to the customer. */
  reply: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  // ── Side-effect tracking ───────────────────────────────────────
  /** Updated lifecycle state, if the agent triggered a transition. */
  updatedLifecycleState: Annotation<CustomerLifecycleState | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** ID of a newly created escalation record, if applicable. */
  escalationId: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** ID of a newly created or updated appointment record, if applicable. */
  appointmentId: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** ID of a newly created knowledge request for owner review, if applicable. */
  knowledgeRequestId: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  /** Internal metadata for debugging and observability (latency, model used, etc.). */
  metadata: Annotation<Record<string, any>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;

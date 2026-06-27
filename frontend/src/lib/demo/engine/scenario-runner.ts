import type { Scenario, ScenarioNode, DemoMessage } from './types';
import { DemoEventBus } from './demo-event-bus';

export class ScenarioRunner {
  private currentNode: ScenarioNode | null = null;
  private context: Record<string, string> = {};
  scenario: Scenario;

  constructor(scenario: Scenario, private bus: DemoEventBus) {
    this.scenario = scenario;
  }

  start(): { message: DemoMessage; node: ScenarioNode } {
    const node = this.scenario.nodes[this.scenario.entryNodeId];
    this.currentNode = node;
    node.effects?.forEach(effect => {
      const payload = this.resolveEffectPayload(effect.payload as Record<string, unknown>);
      (this.bus.emit as any)(effect.type, payload);
    });
    return { message: this.createMessage(this.resolveTemplate(node.aiMessage)), node };
  }

  transition(input: string): { message: DemoMessage; node: ScenarioNode } | null {
    if (!this.currentNode?.transitions) return null;

    const exactMatch = this.currentNode.quickReplies?.find(
      qr => qr.toLowerCase() === input.toLowerCase()
    );

    let nextId: string | undefined;
    if (exactMatch) {
      nextId = this.currentNode.transitions[exactMatch];
    }

    if (!nextId) {
      const lowerInput = input.toLowerCase();
      for (const [qr, target] of Object.entries(this.currentNode.transitions)) {
        if (lowerInput.includes(qr.toLowerCase()) || qr.toLowerCase().includes(lowerInput)) {
          nextId = target;
          break;
        }
      }
    }

    if (!nextId) {
      nextId = this.currentNode.transitions[input];
    }

    if (!nextId) return null;

    if (exactMatch) this.context.selected_service = exactMatch;

    const node = this.scenario.nodes[nextId];
    if (!node) return null;

    this.currentNode = node;

    node.effects?.forEach(effect => {
      const payload = this.resolveEffectPayload(effect.payload as Record<string, unknown>);
      (this.bus.emit as any)(effect.type, payload);
    });

    return { message: this.createMessage(this.resolveTemplate(node.aiMessage)), node };
  }

  private resolveTemplate(text: string): string {
    return text.replace(/\{(\w+)\}/g, (_, key) => this.context[key] || key);
  }

  private resolveEffectPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      resolved[key] = typeof value === 'string' ? this.resolveTemplate(value) : value;
    }
    return resolved;
  }

  private fallback() {
    return {
      message: this.createMessage("I'm not sure I understood that. Could you please rephrase?"),
      node: this.currentNode!,
    };
  }

  private createMessage(content: string): DemoMessage {
    return { id: crypto.randomUUID(), role: 'ai' as const, content, timestamp: Date.now() };
  }

  reset(): void {
    this.currentNode = null;
    this.context = {};
  }
}

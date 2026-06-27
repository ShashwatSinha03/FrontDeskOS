import type { Scenario, ScenarioId, DemoMessage } from './types';
import { DemoEventBus } from './demo-event-bus';
import { matchIntent } from './intent-matcher';
import { ScenarioRunner } from './scenario-runner';
import { scenarios } from '../data/scenarios';

export interface ConversationState {
  messages: DemoMessage[];
  isActive: boolean;
  isThinking: boolean;
  currentScenario: ScenarioId | null;
  quickReplies: string[];
}

export class ConversationEngine {
  private runner: ScenarioRunner | null = null;
  private currentScenarioId: ScenarioId | null = null;
  private messages: DemoMessage[] = [];
  private thinkingDelay = 1200;

  constructor(private bus: DemoEventBus) {}

  start(): ConversationState {
    const greeting = scenarios.greeting;
    this.runner = new ScenarioRunner(greeting, this.bus);
    this.currentScenarioId = 'greeting';
    const { message, node } = this.runner.start();
    this.messages = [this.createCustomerMessage('Hello!'), message];
    this.bus.emit('demo_started', {});
    return this.getState(node.quickReplies);
  }

  async processInput(input: string): Promise<ConversationState> {
    this.messages.push(this.createCustomerMessage(input));

    this.setState({ isThinking: true });

    await this.delay(this.thinkingDelay);

    let result = this.runner?.transition(input) ?? null;

    if (!result) {
      const intent = matchIntent(input);
      if (intent && intent !== this.currentScenarioId) {
        const scenario = scenarios[intent];
        if (scenario) {
          this.runner = new ScenarioRunner(scenario, this.bus);
          this.currentScenarioId = intent;
          result = this.runner.start();
        }
      }
    }

    if (!result) {
      this.runner = new ScenarioRunner(scenarios.fallback, this.bus);
      this.currentScenarioId = 'fallback';
      result = this.runner.start();
    }

    if (result.message.content.length > 80) {
      await this.delay(600);
    }

    this.messages.push(result.message);

    return this.getState(result.node.quickReplies);
  }

  private getState(quickReplies?: string[]): ConversationState {
    return {
      messages: [...this.messages],
      isActive: true,
      isThinking: false,
      currentScenario: this.currentScenarioId,
      quickReplies: quickReplies ?? [],
    };
  }

  private setState(_partial: Partial<ConversationState>): void {
  }

  private createCustomerMessage(content: string): DemoMessage {
    return { id: crypto.randomUUID(), role: 'customer' as const, content, timestamp: Date.now() };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset(): void {
    this.runner = null;
    this.currentScenarioId = null;
    this.messages = [];
  }
}

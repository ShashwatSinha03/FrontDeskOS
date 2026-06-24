import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
}

export interface ILLMProvider {
  name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  getLangChainModel(options?: LLMOptions): BaseChatModel;
}

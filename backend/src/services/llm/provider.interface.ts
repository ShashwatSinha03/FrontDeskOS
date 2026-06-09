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

export interface ILLMProvider {
  name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  getLangChainModel(options?: LLMOptions): BaseChatModel;
}

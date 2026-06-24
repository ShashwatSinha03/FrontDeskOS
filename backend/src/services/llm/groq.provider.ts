import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGroq, ChatGroqInput } from '@langchain/groq';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ILLMProvider, LLMMessage, LLMOptions, LLMResponse, LLMUsage } from './provider.interface';
import config from '../../config';

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq';

  getLangChainModel(options?: LLMOptions): BaseChatModel {
    if (!config.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const input: ChatGroqInput = {
      apiKey: config.GROQ_API_KEY,
      model: config.GROQ_MODEL as string,
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens,
    };

    return new ChatGroq(input);
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!config.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const model = config.GROQ_MODEL as string;

    const input: ChatGroqInput = {
      apiKey: config.GROQ_API_KEY,
      model,
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens,
    };

    const chatModel = new ChatGroq(input);

    const langChainMessages = messages.map((m) => {
      switch (m.role) {
        case 'system':
          return new SystemMessage(m.content);
        case 'assistant':
          return new AIMessage(m.content);
        case 'user':
        default:
          return new HumanMessage(m.content);
      }
    });

    const callOptions = options?.responseFormat === 'json'
      ? { response_format: { type: 'json_object' as const } }
      : {};

    const response = await chatModel.invoke(langChainMessages, callOptions);

    const aimessage = response as AIMessage;
    const usageMetadata = aimessage.usage_metadata;

    const usage: LLMUsage = {
      inputTokens: usageMetadata?.input_tokens ?? 0,
      outputTokens: usageMetadata?.output_tokens ?? 0,
      totalTokens: usageMetadata?.total_tokens ?? 0,
    };

    return {
      content: response.content as string,
      usage,
      model,
    };
  }
}

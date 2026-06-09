import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGroq, ChatGroqInput } from '@langchain/groq';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ILLMProvider, LLMMessage, LLMOptions } from './provider.interface';
import config from '../../config';

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq';

  /**
   * Returns a configured ChatGroq model instance.
   * Note: response_format is a call-time option, not a constructor field.
   * It is passed directly in the chat() method via model.invoke() options.
   */
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

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    if (!config.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const input: ChatGroqInput = {
      apiKey: config.GROQ_API_KEY,
      model: config.GROQ_MODEL as string,
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens,
    };

    const model = new ChatGroq(input);

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

    // response_format is a ChatGroqCallOptions field — passed as invoke() option
    const callOptions = options?.responseFormat === 'json'
      ? { response_format: { type: 'json_object' as const } }
      : {};

    const response = await model.invoke(langChainMessages, callOptions);
    return response.content as string;
  }
}

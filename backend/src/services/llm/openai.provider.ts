import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ILLMProvider, LLMMessage, LLMOptions, LLMResponse, LLMUsage } from './provider.interface';
import config from '../../config';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';

  getLangChainModel(options?: LLMOptions): BaseChatModel {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const modelParams: Record<string, any> = {
      apiKey: config.OPENAI_API_KEY,
      model: config.OPENAI_MODEL,
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens,
    };

    if (options?.responseFormat === 'json') {
      modelParams.modelKwargs = { response_format: { type: 'json_object' } };
    }

    return new ChatOpenAI(modelParams);
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const modelName = config.OPENAI_MODEL as string;
    const modelParams: Record<string, any> = {
      apiKey: config.OPENAI_API_KEY,
      model: modelName,
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens,
    };

    if (options?.responseFormat === 'json') {
      modelParams.modelKwargs = { response_format: { type: 'json_object' } };
    }

    const model = new ChatOpenAI(modelParams);

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

    const response = await model.invoke(langChainMessages);

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
      model: modelName,
    };
  }
}

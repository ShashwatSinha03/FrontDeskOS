import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ILLMProvider, LLMMessage, LLMOptions } from './provider.interface';
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

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const model = this.getLangChainModel(options);
    
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
    return response.content as string;
  }
}

import { ILLMProvider } from './provider.interface';
import { GroqProvider } from './groq.provider';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import config from '../../config';

export class LLMProviderFactory {
  private static providers: Map<string, ILLMProvider> = new Map<string, ILLMProvider>([
    ['groq', new GroqProvider()],
    ['openai', new OpenAIProvider()],
    ['anthropic', new AnthropicProvider()],
  ]);

  /**
   * Resolves the configured LLM provider.
   * Defaults to LLM_PROVIDER in the environment configuration.
   */
  static getProvider(name?: string): ILLMProvider {
    const providerName = name || config.LLM_PROVIDER;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`LLM Provider '${providerName}' is not supported or configured.`);
    }
    
    return provider;
  }
}
export default LLMProviderFactory;

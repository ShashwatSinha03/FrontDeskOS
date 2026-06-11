import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database Configuration
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL is required for PostgreSQL connections',
  }),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string({
    required_error: 'SUPABASE_SERVICE_ROLE_KEY is required for admin bypass access',
  }),

  // AI Provider Abstraction Configurations
  LLM_PROVIDER: z.enum(['groq', 'openai', 'anthropic']).default('groq'),

  // Groq Settings
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  // OpenAI Settings
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),

  // Anthropic Settings
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20240620'),

  // Admin Auth
  ADMIN_API_KEY: z.string().default('dev-api-key-change-in-production'),
}).refine((data) => {
  // Enforce that active provider has its respective API key
  if (data.LLM_PROVIDER === 'groq' && !data.GROQ_API_KEY) {
    return false;
  }
  if (data.LLM_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
    return false;
  }
  if (data.LLM_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
    return false;
  }
  return true;
}, {
  message: 'The API key for the selected LLM_PROVIDER must be provided.',
});

// Run parsing
const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedConfig.error.format(), null, 2));
  process.exit(1);
}

export const config = parsedConfig.data;
export type Config = z.infer<typeof configSchema>;
export default config;

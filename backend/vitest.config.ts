import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts', '**/node_modules/**'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://localhost:5432/frontdeskos_test',
      ADMIN_API_KEY: 'test-api-key',
      LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
  },
});

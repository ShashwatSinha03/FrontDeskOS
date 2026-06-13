import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    nodeProfilingIntegration(),
    Sentry.expressIntegration(),
  ],
});

import app from './app';
import config from './config';
import { logger } from './lib/logger';

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION', { error: reason instanceof Error ? reason.message : String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION', { error: err instanceof Error ? err.message : String(err) });
});

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 Nevura Backend listening on port ${config.PORT}`, { port: config.PORT });
  logger.info(`👉 Environment: ${config.NODE_ENV}`, { environment: config.NODE_ENV });
  logger.info(`👉 LLM Provider: ${config.LLM_PROVIDER}`, { provider: config.LLM_PROVIDER });
});

export default app;
export { server };
// Deployment: 00346cd

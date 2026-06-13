import app from './app';
import config from './config';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Nevura Backend listening on port ${config.PORT}`);
  console.log(`👉 Environment: ${config.NODE_ENV}`);
  console.log(`👉 LLM Provider: ${config.LLM_PROVIDER}`);
});

export default app;
export { server };
// Deployment: 00346cd

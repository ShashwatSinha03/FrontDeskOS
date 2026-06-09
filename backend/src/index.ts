import app from './app';
import config from './config';

const server = app.listen(config.PORT, () => {
  console.log(`🚀 FrontDeskOS Backend listening on port ${config.PORT}`);
  console.log(`👉 Environment: ${config.NODE_ENV}`);
  console.log(`👉 LLM Provider: ${config.LLM_PROVIDER}`);
});

export default app;
export { server };

import * as Sentry from '@sentry/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { publicRouter, adminRouter } from './routes/api.routes';
import { meRouter } from './routes/me.routes';
import { founderRouter } from './routes/founder.routes';
import { teamRouter } from './routes/team.routes';
import { settingsRouter } from './routes/settings.routes';
import { operationalRouter } from './routes/operational.routes';
import { notificationRouter } from './routes/notification.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { createRateLimiter, chatLimiter } from './middleware/rate-limit';
import { logger } from './lib/logger';

const app = express();

app.use(helmet());

if (config.NODE_ENV === 'production') {
  const allowedOrigins = [
    'https://nuvoraos.app',
    'https://brightsmile.nuvoraos.app',
    'https://nuvoraos.vercel.app',
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
} else {
  app.use(cors());
}

const publicLimiter = createRateLimiter(200);
const adminLimiter = createRateLimiter(100, 15 * 60 * 1000, (req) =>
  req.path.startsWith('/public')
);
app.use('/api', publicLimiter);
app.use('/api', adminLimiter);

app.use(express.json({ limit: '10kb' }));

app.use('/api', publicRouter);
app.use('/api', meRouter);
app.use('/api/ops', founderRouter);
app.use('/api', teamRouter);
app.use('/api', settingsRouter);
app.use('/api', operationalRouter);
app.use('/api', notificationRouter);
app.use('/api', analyticsRouter);
app.use('/api', adminRouter);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    provider: config.LLM_PROVIDER
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(err);
  logger.error('❌ Global error encountered', { error: err instanceof Error ? err.message : String(err) });
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

Sentry.setupExpressErrorHandler(app);

export default app;

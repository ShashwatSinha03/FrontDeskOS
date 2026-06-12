import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
import { publicRouter, adminRouter } from './routes/api.routes';
import { meRouter } from './routes/me.routes';
import { founderRouter } from './routes/founder.routes';
import onboardingRouter from './routes/onboarding.routes';
import { requireApiKey } from './middleware/auth';
import { teamRouter } from './routes/team.routes';
import { settingsRouter } from './routes/settings.routes';
import { operationalRouter } from './routes/operational.routes';
import { notificationRouter } from './routes/notification.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { createRateLimiter } from './middleware/rate-limit';

const app = express();

if (config.NODE_ENV === 'production') {
  const allowedOrigins = [
    'https://frontdeskos.app',
    'https://brightsmile.frontdeskos.app',
    'https://frontdeskos.vercel.app',
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
  req.path.startsWith('/public') || req.path.startsWith('/chat')
);
app.use('/api', publicLimiter);
app.use('/api', adminLimiter);

app.use(express.json({ limit: '10kb' }));

app.use('/api', publicRouter);
app.use('/api', meRouter);
app.use('/api/ops', founderRouter);
app.use('/api', teamRouter);
app.use('/api', settingsRouter);
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/onboarding')) {
    return requireApiKey(req, res, next);
  }
  next();
}, onboardingRouter);
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
  console.error('❌ Global error encountered:', err);
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

export default app;

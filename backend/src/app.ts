import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
import { publicRouter, adminRouter, founderRouter } from './routes/api.routes';
import { authenticate } from './middleware/authenticate';
import { loadProfile } from './middleware/load-profile';
import { requireSuperAdmin } from './middleware/require-super-admin';
import { loadMembership } from './middleware/load-membership';
import { requireBusinessRole } from './middleware/require-business-role';
import { requireSubscription } from './middleware/require-subscription';
import { usersRouter } from './routes/admin/users.routes';
import { teamRouter } from './routes/admin/team.routes';
import { settingsRouter } from './routes/admin/settings.routes';
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

// Current user profile endpoint — used by frontend auth to verify session and load profile
app.get('/api/me', authenticate, loadProfile, (req: Request, res: Response) => {
  res.json({ success: true, data: req.profile });
});

// Founder OS routes — mounted BEFORE adminRouter to bypass requireApiKey
// Supports both Bearer token (user auth) and x-api-key (service auth) via authenticate middleware
app.use('/api/founder', authenticate, loadProfile, requireSuperAdmin, founderRouter);

// SUPER_ADMIN users management — list, update roles, manage memberships
app.use('/api/admin/users', authenticate, loadProfile, requireSuperAdmin, usersRouter);

// Owner team management — invite staff, manage roles, remove members
// Ownership verified inside controller because businessId comes from request body/query
app.use('/api/admin/team', authenticate, loadProfile, teamRouter);

// Settings endpoints — protected by business membership + role + subscription
app.use('/api/admin/settings', authenticate, loadProfile, loadMembership, requireBusinessRole('owner', 'manager', 'staff'), requireSubscription, settingsRouter);

// Membership check endpoint — used by tenant dashboard layout to verify user belongs to business
app.get('/api/admin/membership', authenticate, loadProfile, loadMembership, (req: Request, res: Response) => {
  res.json({ success: true, data: req.membership });
});

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

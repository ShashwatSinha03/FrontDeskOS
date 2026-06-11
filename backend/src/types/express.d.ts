import 'express';
import type { User } from '@supabase/supabase-js';
import type { Membership } from '../middleware/load-membership';

declare module 'express' {
  interface Request {
    sessionId?: string;
    customerId?: string;
    user?: User;
    membership?: Membership | null;
  }
}

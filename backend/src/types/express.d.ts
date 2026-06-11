import 'express';

declare module 'express' {
  interface Request {
    sessionId?: string;
    customerId?: string;
    authContext?: {
      type: 'user' | 'service';
      userId?: string;
      service?: string;
    };
    profile?: {
      id: string;
      email: string;
      full_name: string;
      global_role: string;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
    } | null;
    membership?: {
      id: string;
      user_id: string;
      business_id: string;
      role: string;
      full_name: string;
      status: string;
      created_at: string;
      updated_at: string;
    } | null;
    subscriptionCapabilities?: {
      status: string;
      canViewDashboard: boolean;
      canMutateData: boolean;
      canUseAI: boolean;
      canUseBooking: boolean;
      canCaptureLeads: boolean;
    };
  }
}

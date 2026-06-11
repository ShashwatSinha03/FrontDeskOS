import 'express';

declare module 'express' {
  interface Request {
    sessionId?: string;
    customerId?: string;
  }
}

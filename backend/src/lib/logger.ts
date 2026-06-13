type LogContext = {
  requestId?: string;
  route?: string;
  userId?: string;
  businessId?: string;
  [key: string]: unknown;
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private baseContext: LogContext = {};

  child(context: LogContext): Logger {
    const child = new Logger();
    child.baseContext = { ...this.baseContext, ...context };
    return child;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.baseContext,
      ...context,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') console.log(output);
        break;
      default:
        console.log(output);
    }
  }

  info(message: string, context?: LogContext) { this.log('info', message, context); }
  warn(message: string, context?: LogContext) { this.log('warn', message, context); }
  error(message: string, context?: LogContext) { this.log('error', message, context); }
  debug(message: string, context?: LogContext) { this.log('debug', message, context); }
}

export const logger = new Logger();
export default logger;

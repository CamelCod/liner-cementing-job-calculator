/**
 * Production-safe logging utility
 * 
 * Provides logging that is automatically stripped from production builds
 * while maintaining development debugging capabilities.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LoggerConfig {
  level: LogLevel;
  enabledInProduction: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enabledInProduction: false,
      ...config
    };
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return (this.isDevelopment || this.config.enabledInProduction) && 
           level <= this.config.level;
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `${timestamp} ${prefix} ${message}`;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log calculation results for development debugging
   */
  calculation(operation: string, inputs: Record<string, unknown>, result: unknown): void {
    this.debug(`Calculation: ${operation}`, { inputs, result });
  }

  /**
   * Log API calls for development debugging
   */
  apiCall(endpoint: string, status: 'success' | 'error', details?: unknown): void {
    if (status === 'error') {
      this.error(`API Error: ${endpoint}`, details);
    } else {
      this.debug(`API Success: ${endpoint}`, details);
    }
  }
}

// Default logger instance
export const logger = new Logger({ prefix: 'LinerCalc' });

// Specialized loggers for different modules
export const calculationLogger = new Logger({ 
  prefix: 'Calculations', 
  level: LogLevel.DEBUG 
});

export const apiLogger = new Logger({ 
  prefix: 'API', 
  level: LogLevel.WARN 
});

export const securityLogger = new Logger({ 
  prefix: 'Security', 
  level: LogLevel.ERROR,
  enabledInProduction: true // Security logs should be available in production
});

export default logger;
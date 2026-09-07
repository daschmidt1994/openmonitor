import { ConsoleLogger, Injectable, LoggerService, Scope } from "@nestjs/common";

/**
 * Structured JSON logger: {timestamp, level, service, context, requestId, message}.
 * Never receives secrets (passwords, tokens, password hashes) -- callers must
 * not pass them as log arguments; see AuditLogService for the one place that
 * intentionally records sensitive *actions* (never secret values).
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService extends ConsoleLogger implements LoggerService {
  private requestId?: string;

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private write(level: string, message: unknown, context?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: "api",
      context: context ?? this.context,
      requestId: this.requestId,
      message,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }

  log(message: unknown, context?: string) {
    this.write("info", message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write("error", trace ? `${message} :: ${trace}` : message, context);
  }
  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }
  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write("verbose", message, context);
  }
}

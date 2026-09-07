import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import type { ApiErrorResponse } from "@openmonitor/shared";
import type { RequestWithId } from "../middleware/request-id.middleware";

/**
 * Converts every thrown error into the consistent ApiErrorResponse envelope
 * documented in the API. Never leaks stack traces or internal error details
 * for unhandled (5xx) exceptions.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "InternalServerError";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
        error = exception.name;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message) ? b.message.join("; ") : ((b.message as string) ?? exception.message);
        details = Array.isArray(b.message) ? b.message : undefined;
        error = (b.error as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`, (exception as Error)?.stack);
    }

    const payload: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };

    response.status(status).json(payload);
  }
}

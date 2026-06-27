import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const logger = new Logger('HttpExceptionFilter');

type RequestWithId = Request & { requestId?: string };

function normalizeMessage(responseBody: unknown): { message: unknown; error?: string; issues?: unknown } {
  if (typeof responseBody === 'string') return { message: responseBody };
  if (responseBody && typeof responseBody === 'object') {
    const body = responseBody as Record<string, unknown>;
    return {
      message: body.message ?? 'Request failed',
      error: typeof body.error === 'string' ? body.error : undefined,
      issues: body.issues
    };
  }
  return { message: 'Request failed' };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttp ? exception.getResponse() : undefined;
    const normalized = normalizeMessage(exceptionResponse);

    if (!isHttp) {
      const message = exception instanceof Error ? exception.message : String(exception);
      logger.error(`${request.method} ${request.originalUrl} failed: ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(statusCode).json({
      statusCode,
      error: normalized.error ?? (statusCode >= 500 ? 'Internal Server Error' : HttpStatus[statusCode] ?? 'Error'),
      message: normalized.message,
      ...(normalized.issues ? { issues: normalized.issues } : {}),
      path: request.originalUrl,
      method: request.method,
      requestId: request.requestId ?? response.getHeader('x-request-id') ?? null,
      timestamp: new Date().toISOString()
    });
  }
}

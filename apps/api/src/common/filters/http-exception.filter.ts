import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponsePayload {
  message?: string | string[];
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal error occurred';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = exception.name;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as ErrorResponsePayload;
        
        // Handle class-validator error array
        if (Array.isArray(payload.message)) {
          errorCode = 'VALIDATION_FAILED';
          message = 'Input validation failed';
          details = payload.message.map((msg) => ({ issue: msg }));
        } else {
          message = (payload.message as string) || exception.message;
          errorCode = (payload.error as string) || exception.name;
          details = payload.details ?? null;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: {
        code: errorCode.toUpperCase().replace(/\s+/g, '_'),
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

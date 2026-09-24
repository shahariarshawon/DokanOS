import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    // Assign or propagate correlation ID
    const correlationId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = correlationId;
    res.setHeader('X-Request-Id', correlationId);

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      const logPayload = {
        correlationId,
        method,
        path: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        contentLength,
        userAgent,
      };

      if (statusCode >= 500) {
        this.logger.error(`HTTP Request Failed`, JSON.stringify(logPayload));
      } else if (statusCode >= 400) {
        this.logger.warn(`HTTP Client Warning`, JSON.stringify(logPayload));
      } else {
        this.logger.log(`HTTP Request Success: ${method} ${originalUrl} ${statusCode} - ${duration}ms [${correlationId}]`);
      }
    });

    next();
  }
}

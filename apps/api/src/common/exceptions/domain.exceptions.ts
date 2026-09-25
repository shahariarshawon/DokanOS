import { HttpException, HttpStatus } from '@nestjs/common';

export class TenantAccessDeniedException extends HttpException {
  constructor(
    message = 'Cross-tenant access forbidden. You cannot access resources owned by another merchant.',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'TenantAccessDenied',
        message,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ResourceConflictException extends HttpException {
  constructor(message = 'A resource with this identifier already exists.') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'ResourceConflict',
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidTokenException extends HttpException {
  constructor(
    message = 'The provided token is invalid, expired, or has been revoked.',
  ) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'InvalidToken',
        message,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid username or password',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class TokenExpiredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Token has expired',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InvalidTokenException extends HttpException {
  constructor(details?: string) {
    super(
      {
        message: 'Invalid token',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
        ...(details && { details }),
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class UserNotFoundException extends HttpException {
  constructor(identifier: string) {
    super(
      {
        message: 'User not found',
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
        details: `User with identifier '${identifier}' does not exist`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(username: string) {
    super(
      {
        message: 'User already exists',
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
        details: `User with username '${username}' already exists`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

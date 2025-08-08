import {
  Controller,
  Post,
  Request,
  UseGuards,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { LoggerService } from '../common/logger.service';

// Response DTOs for documentation
class AuthTokenResponse {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expires_in: number;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  token_type: string;

  @ApiProperty({ description: 'User information' })
  user: {
    username: string;
    email: string;
    roles: string[];
  };
}

class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;
}

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with username and password to receive JWT token',
  })
  @ApiBody({ type: LoginDto, description: 'User login credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthTokenResponse,
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid request data',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Invalid credentials',
    type: ErrorResponse,
  })
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body(ValidationPipe) loginDto: LoginDto) {
    try {
      this.logger.log(
        `Login attempt for user: ${loginDto.username}`,
        'AuthController',
      );
      const result = await this.authService.login(req.user);

      // Don't log the actual token for security
      this.logger.log(
        `Login successful for user: ${loginDto.username}`,
        'AuthController',
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Login failed for user: ${loginDto.username}`,
        error.message,
        'AuthController',
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Refresh JWT token',
    description: 'Get a new JWT token using an existing valid token',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthTokenResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Invalid or expired token',
    type: ErrorResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req) {
    try {
      const username = req.user.username;
      this.logger.log(
        `Token refresh request for user: ${username}`,
        'AuthController',
      );

      const result = await this.authService.refreshToken(req.user);

      this.logger.log(
        `Token refresh successful for user: ${username}`,
        'AuthController',
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Token refresh failed for user: ${req.user?.username || 'unknown'}`,
        error.message,
        'AuthController',
      );
      throw error;
    }
  }
}

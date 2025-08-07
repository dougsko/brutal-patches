import { Controller, Post, Request, UseGuards, Body, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { LoggerService } from '../common/logger.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body(ValidationPipe) loginDto: LoginDto) {
    try {
      this.logger.log(`Login attempt for user: ${loginDto.username}`, 'AuthController');
      const result = await this.authService.login(req.user);
      
      // Don't log the actual token for security
      this.logger.log(`Login successful for user: ${loginDto.username}`, 'AuthController');
      
      return result;
    } catch (error) {
      this.logger.error(`Login failed for user: ${loginDto.username}`, error.message, 'AuthController');
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req) {
    try {
      const username = req.user.username;
      this.logger.log(`Token refresh request for user: ${username}`, 'AuthController');
      
      const result = await this.authService.refreshToken(req.user);
      
      this.logger.log(`Token refresh successful for user: ${username}`, 'AuthController');
      
      return result;
    } catch (error) {
      this.logger.error(`Token refresh failed for user: ${req.user?.username || 'unknown'}`, error.message, 'AuthController');
      throw error;
    }
  }
}

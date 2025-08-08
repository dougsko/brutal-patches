import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../common/logger.service';
import {
  InvalidCredentialsException,
  UserNotFoundException,
} from '../common/exceptions/auth.exceptions';
import * as bcrypt from 'bcryptjs';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    try {
      this.logger.log(`Validating user: ${username}`, 'AuthService');

      const response = await this.usersService.getUserByUsername(username);

      if (!response.data || response.data.length === 0) {
        this.logger.warn(`User not found: ${username}`, 'AuthService');
        throw new UserNotFoundException(username);
      }

      const user = response.data[0];

      // Validate password
      const isPasswordValid = await bcrypt.compare(pass, user.password);

      if (!isPasswordValid) {
        this.logger.warn(
          `Invalid password attempt for user: ${username}`,
          'AuthService',
        );
        this.logger.logAuth('login_failed', username, false, {
          reason: 'invalid_password',
        });
        throw new InvalidCredentialsException();
      }

      this.logger.log(`User validation successful: ${username}`, 'AuthService');
      this.logger.logAuth('user_validated', username, true);

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return [userWithoutPassword];
    } catch (error) {
      if (
        error instanceof UserNotFoundException ||
        error instanceof InvalidCredentialsException
      ) {
        throw error;
      }

      this.logger.error(
        `Error validating user ${username}:`,
        error.message,
        'AuthService',
        {
          stack: error.stack,
        },
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: User) {
    try {
      this.logger.log(`User login: ${user.username}`, 'AuthService');

      const payload = {
        username: user.username,
        sub: user.username,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload, jwtConstants.signOptions);

      this.logger.logAuth('login_success', user.username, true);

      return {
        username: user.username,
        email: user.email,
        roles: user.roles || ['user'],
        access_token: token,
        expires_in: jwtConstants.signOptions.expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Login error for user ${user.username}:`,
        error.message,
        'AuthService',
      );
      throw new UnauthorizedException('Login failed');
    }
  }

  async refreshToken(user: User) {
    try {
      this.logger.log(
        `Token refresh for user: ${user.username}`,
        'AuthService',
      );

      const payload = {
        username: user.username,
        sub: user.username,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload, jwtConstants.signOptions);

      this.logger.logAuth('token_refreshed', user.username, true);

      return {
        username: user.username,
        email: user.email,
        roles: user.roles || ['user'],
        access_token: token,
        refreshed: true,
        expires_in: jwtConstants.signOptions.expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Token refresh error for user ${user.username}:`,
        error.message,
        'AuthService',
      );
      this.logger.logAuth('token_refresh_failed', user.username, false, {
        error: error.message,
      });
      throw new UnauthorizedException('Token refresh failed');
    }
  }
}

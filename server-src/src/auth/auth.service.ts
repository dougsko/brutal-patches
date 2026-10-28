import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logger.service';

@Injectable()
export class AuthService {
  constructor(private logger: LoggerService) {}

  async getProfile(email: string) {
    this.logger.log(`Google login: ${email}`, 'AuthService');
    return { email, provider: 'google' };
  }
}

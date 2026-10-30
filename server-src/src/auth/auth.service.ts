import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(private jwtService: any) {}

  getProfile(email: string) {
    const username = email.split('@')[0];
    return { email, username, provider: 'google' };
  }

  signToken(payload: object): string {
    return this.jwtService.sign(payload);
  }
}

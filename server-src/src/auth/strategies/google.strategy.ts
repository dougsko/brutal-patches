import { Strategy } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';

export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: '/auth/google/callback',
      scope: ['email', 'profile'],
    }, async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
      const email = profile.emails?.[0]?.value || profile.username;
      done(null, { email, username: email.split('@')[0] });
    });
  }
}

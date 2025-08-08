import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      issuer: jwtConstants.signOptions.issuer,
      audience: jwtConstants.signOptions.audience,
    });
  }

  async validate(payload: any) {
    // Additional validation for token payload
    if (!payload || !payload.sub || !payload.username) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // Check token expiration (double check, should be handled by passport but better safe)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new UnauthorizedException('Token has expired');
    }
    
    return { 
      id: payload.sub, 
      username: payload.username,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp
    };
  }
}

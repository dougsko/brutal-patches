import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/interfaces/user.interface';
import { CreateUserDto } from 'src/users/dto/create-user-dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    try {
      const response = await this.usersService.getUserByUsername(username);
      console.log('Auth validateUser response:', response);
      
      if (response.data && response.data.length > 0) {
        const user = response.data[0];
        if (bcrypt.compareSync(pass, user.password)) {
          console.log('Password validation successful for user:', username);
          return response.data;
        }
      }
      console.log('Password validation failed for user:', username);
      return null;
    } catch (error) {
      console.error('Error in validateUser:', error);
      return null;
    }
  }

  async login(user: User) {
    const payload = {
      username: user.username,
      sub: user.username,
      email: user.email,
    };
    return {
      username: user.username,
      email: user.email,
      roles: user.roles || ['user'],
      access_token: this.jwtService.sign(payload),
    };
  }

  async refreshToken(user: User) {
    // Generate a new token for the authenticated user
    const payload = {
      username: user.username,
      sub: user.username,
      email: user.email,
    };
    
    return {
      username: user.username,
      email: user.email,
      roles: user.roles || ['user'],
      access_token: this.jwtService.sign(payload),
      refreshed: true,
    };
  }
}

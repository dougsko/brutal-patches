import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/interfaces/user.interface';
import { CreateUserDto } from 'src/users/dto/create-user-dto';
import { UsersService } from '../users/users.service';

const bcrypt = require('bcryptjs');

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    let userDto: CreateUserDto = {
      username: username,
      email: null,
      password: pass
    }
    let response = await this.usersService.getUserByUsername(userDto.username);
    if (bcrypt.compareSync(pass, response.data[0].password)) {
      return response.data;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.username, email: user.email };
    return {
      username: user.username,
      access_token: this.jwtService.sign(payload),
    };
  }
}

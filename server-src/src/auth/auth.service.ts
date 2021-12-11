import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import AWS from 'aws-sdk';
import * as bcrypt from 'bcrypt';
import { User } from 'src/interfaces/user.interface';
import { CreateUserDto } from 'src/users/dto/create-user-dto';
import { v4 as uuid } from 'uuid';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id, email: user.email, roles: user.roles };
    return {
      username: user.username,
      roles: user.roles,
      access_token: this.jwtService.sign(payload),
    };
  }

  async createUser(createUserDto: CreateUserDto) {
    /* const createdOffer = await this.userRepository.createUser(createUserDto);
    return createdOffer; */
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);

    const newUser = {
      id: uuid(),
      username: createUserDto.username,
      email: createUserDto.email,
      password: hash
  };

  try {
      await new AWS.DynamoDB.DocumentClient()
          .put({
              TableName: process.env.USERS_TABLE_NAME,
              Item: newUser,
          })
          .promise();
  } catch (error) {
      throw new InternalServerErrorException(error);
  }

  return { ok: true, data: newUser };

  }

}

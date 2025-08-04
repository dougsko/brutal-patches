import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user-dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      username: 'john',
      password: '$2a$10$8xPHnOJ/u/hTEhwUEmW6heUKAsA6o3i.lx4oLg9ylcQLALR79de6i', // 'changeme'
      email: 'john@gmail.com',
      roles: ['admin'],
      patches: [567, 623, 707, 710],
    },
    {
      username: 'maria',
      password: '$2a$10$.uduR30EnQScbkm3Em7Se.5AJI4zsKipYRwyi6khCkSLmHP7Br5x6', // 'guess'
      email: 'maria@gmail.com',
      roles: ['user'],
      patches: [],
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async findOneByUsername(username: string): Promise<User | undefined> {
    let myUser: User;
    this.users.forEach((user) => {
      if (user.username == username) {
        myUser = user;
        return user;
      }
    });
    return myUser;
  }

  async createUser(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = this.users.find(user => user.username === createUserDto.username);
    if (existingUser) {
      throw new HttpException(
        'Username already exists.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(createUserDto.password, salt);

    const newUser = {
      username: createUserDto.username,
      email: createUserDto.email,
      password: hash,
      roles: ['user'],
      patches: [],
    };
    
    // Add to in-memory array for local development
    this.users.push(newUser);
    console.log('New user created:', newUser);

    return { ok: true, data: newUser };
  }

  async getUserByUsername(username: string) {
    // Use in-memory array for local development
    const user = this.users.filter(u => u.username === username);
    
    console.log(`Looking for user: ${username}`, user);
    
    return { ok: true, data: user };
  }
}

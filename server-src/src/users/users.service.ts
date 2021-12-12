import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
// import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user-dto';

const bcrypt = require('bcryptjs');

// This should be a real class/interface representing a user entity

@Injectable()
export class UsersService {
  constructor() { }

  private readonly users: User[] = [
    {
      id: 1,
      username: 'john',
      password: 'changeme',
      email: 'john@gmail.com',
      roles: ['admin'],
      patches: [567, 623, 707, 710]
    },
    {
      id: 2,
      username: 'maria',
      password: 'guess',
      email: 'maria@gmail.com',
      roles: ['user'],
      patches: []
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async findOneById(userId: number): Promise<User | undefined> {
    let myUser: User;
    this.users.forEach(user => {
      if (user.id == userId) {
        myUser = user
        return user;
      }
    });
    return myUser;
  }

  async createUser(createUserDto: CreateUserDto) {
    /* const createdOffer = await this.userRepository.createUser(createUserDto);
    return createdOffer; */
    // const saltOrRounds = 10;
    // const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(createUserDto.password, salt);

    const newUser = {
      id: uuid(),
      username: createUserDto.username,
      email: createUserDto.email,
      password: hash
    };
    console.log(newUser);

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

  async getUserById(id) {
    /* const User = await this.userRepository.getUserById(id);
    return User; */

    let user;
    try {
      const result = await new AWS.DynamoDB.DocumentClient()
        .get({
          TableName: process.env.USERS_TABLE_NAME,
          Key: { id },
        })
        .promise();

      user = result.Item;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return { ok: true, data: user };
  }
}
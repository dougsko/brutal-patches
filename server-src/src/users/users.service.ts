import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user-dto';

const bcrypt = require('bcryptjs');


@Injectable()
export class UsersService {
  constructor() { }

  private readonly users: User[] = [
    {
      username: 'john',
      password: 'changeme',
      email: 'john@gmail.com',
      roles: ['admin'],
      patches: [567, 623, 707, 710]
    },
    {
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

  async findOneByUsername(username: string): Promise<User | undefined> {
    let myUser: User;
    this.users.forEach(user => {
      if (user.username == username) {
        myUser = user
        return user;
      }
    });
    return myUser;
  }

  async createUser(createUserDto: CreateUserDto) {
    let response = await this.getUserByUsername(createUserDto.username);
    if(response.data.length > 0) {
      throw new HttpException('Username already exists.', HttpStatus.BAD_REQUEST)
      // return { ok: false };
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(createUserDto.password, salt);

    const newUser = {
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

  async getUserByUsername(username: string) {
    /* const User = await this.userRepository.getUserById(id);
    return User; */
    let user;

    let params = {
      TableName: 'UsersTable-dev', //process.env.USERS_TABLE_NAME,
      KeyConditionExpression: 'username = :hkey',
      ExpressionAttributeValues: {
        ':hkey': username
      }
    };

    try {
      const result = await new AWS.DynamoDB.DocumentClient()
        .query(params)
        .promise();

      user = result.Items;
      console.log(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }

    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return { ok: true, data: user };
  }
}
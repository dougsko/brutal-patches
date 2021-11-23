import { Injectable } from '@nestjs/common';
import { User } from 'src/interfaces/user.interface';

// This should be a real class/interface representing a user entity

@Injectable()
export class UsersService {
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
    this.users.forEach( user => {
      if(user.id == userId) {
        myUser = user
        return user;
      }
    });
    return myUser;
  }
}
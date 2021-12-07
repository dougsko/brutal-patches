import { Module } from '@nestjs/common';
import { UserRepository } from 'src/repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService, UserRepository],
  controllers: [UsersController]
})
export class UsersModule {}

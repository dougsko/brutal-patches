import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user-dto';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('/test')
  testEndpoint() {
    return { message: 'Users controller is working!' };
  }

  @Post('/create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log('Received createUser request:', createUserDto);
    try {
      const newUser: any = await this.userService.createUser(createUserDto);
      console.log('Service response:', newUser);
      if (newUser.ok) {
        return {
          ok: true,
          data: newUser.data,
        };
      } else {
        return {
          ok: false,
          message: 'Error Trying to Create User',
        };
      }
    } catch (error) {
      console.error('Controller error:', error);
      throw new HttpException(`Error creating user: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/getUserByUsername/:username')
  async getUserById(@Param('username') username: string, @Res() res: any) {
    try {
      const user: any = await this.userService.getUserByUsername(username);
      if (user.ok) {
        return res.status(HttpStatus.OK).send({
          ok: true,
          user: user.data,
        });
      } else {
        return res.status(HttpStatus.BAD_REQUEST).send({
          ok: false,
          message: 'Error Trying to Get User',
        });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        ok: false,
        message: 'Error Trying to reach DB',
        errors: error,
      });
    }
  }
}

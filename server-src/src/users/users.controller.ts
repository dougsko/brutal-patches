import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user-dto';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/test')
  testEndpoint(@Request() req) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoint disabled in production');
    }
    return { 
      message: 'Users controller is working!', 
      user: req.user.username,
      environment: process.env.NODE_ENV || 'development'
    };
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

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async getProfile(@Request() req, @Res() res: any) {
    try {
      const user: any = await this.userService.getUserByUsername(req.user.username);
      if (user.ok && user.data.length > 0) {
        // Return user's own profile with all details
        const { password, ...userWithoutPassword } = user.data[0];
        return res.status(HttpStatus.OK).send({
          ok: true,
          user: userWithoutPassword,
        });
      } else {
        return res.status(HttpStatus.NOT_FOUND).send({
          ok: false,
          message: 'User not found',
        });
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        ok: false,
        message: 'Error retrieving profile',
        errors: error.message,
      });
    }
  }

  @Get('/getUserByUsername/:username')
  async getPublicUserProfile(@Param('username') username: string, @Res() res: any) {
    try {
      const user: any = await this.userService.getUserByUsername(username);
      if (user.ok && user.data.length > 0) {
        // Return only public user information
        const userData = user.data[0];
        const publicProfile = {
          username: userData.username,
          // Only include public fields - no email, password, roles, etc.
          patches: userData.patches || [],
          createdAt: userData.createdAt,
        };
        return res.status(HttpStatus.OK).send({
          ok: true,
          user: publicProfile,
        });
      } else {
        return res.status(HttpStatus.NOT_FOUND).send({
          ok: false,
          message: 'User not found',
        });
      }
    } catch (error) {
      console.error('Error getting public user profile:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        ok: false,
        message: 'Error retrieving user profile',
        errors: error.message,
      });
    }
  }
}

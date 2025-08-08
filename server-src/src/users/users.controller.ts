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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user-dto';
import { UsersService } from './users.service';

// Response DTOs for documentation
class UserResponse {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'User roles', type: [String] })
  roles: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'User patches', type: [Object], required: false })
  patches?: any[];
}

class PublicUserResponse {
  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User patches', type: [Object] })
  patches: any[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;
}

class CreateUserResponse {
  @ApiProperty({ description: 'Success status' })
  ok: boolean;

  @ApiProperty({ description: 'Created user data', type: UserResponse })
  data: UserResponse;
}

class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;
}

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Development-only endpoint for testing authentication'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Test successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: { type: 'string' },
        environment: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden in production',
    type: ErrorResponse
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse
  })
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

  @ApiOperation({
    summary: 'Create new user',
    description: 'Register a new user account in the system'
  })
  @ApiBody({ type: CreateUserDto, description: 'User registration data' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserResponse
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid registration data',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists',
    type: ErrorResponse
  })
  @Post('/create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log('Received createUser request:', createUserDto);
    try {
      const newUser: any = await this.userService.createUser(createUserDto);
      console.log('Service response:', newUser);
      return {
        ok: true,
        data: newUser.data,
      };
    } catch (error) {
      console.error('Controller error:', error);
      
      // Re-throw HttpExceptions as-is (like "Username already exists")
      if (error instanceof HttpException) {
        throw error;
      }
      
      // For other errors, throw a generic 500 error
      throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get the authenticated user\'s complete profile information'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        user: { $ref: '#/components/schemas/UserResponse' }
      }
    }
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'User profile not found',
    type: ErrorResponse
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse
  })
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

  @ApiOperation({
    summary: 'Get public user profile',
    description: 'Get public profile information for any user by username'
  })
  @ApiParam({ name: 'username', description: 'Username to look up' })
  @ApiResponse({
    status: 200,
    description: 'Public profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        user: { $ref: '#/components/schemas/PublicUserResponse' }
      }
    }
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponse
  })
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

import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user-dto';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly saltRounds = 12; // Configurable salt rounds for bcrypt

  // Fallback users for development when DynamoDB is not available
  private readonly fallbackUsers: User[] = [
    {
      id: 'user-1',
      username: 'john',
      password: '$2a$10$8xPHnOJ/u/hTEhwUEmW6heUKAsA6o3i.lx4oLg9ylcQLALR79de6i', // 'changeme'
      email: 'john@gmail.com',
      roles: ['admin'],
      patches: [567, 623, 707, 710],
    },
    {
      id: 'user-2',
      username: 'maria',
      password: '$2a$10$.uduR30EnQScbkm3Em7Se.5AJI4zsKipYRwyi6khCkSLmHP7Br5x6', // 'guess'
      email: 'maria@gmail.com',
      roles: ['user'],
      patches: [],
    },
    {
      id: 'user-3',
      username: 'dougsko',
      password: '$2a$10$8xPHnOJ/u/hTEhwUEmW6heUKAsA6o3i.lx4oLg9ylcQLALR79de6i', // 'changeme'
      email: 'dougsko@gmail.com',
      roles: ['admin'],
      patches: [567, 623],
    },
  ];

  constructor(private readonly userRepository: UserRepository) {
    // Initialize database with fallback users if needed
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Check if we're in a test environment or if table doesn't exist
      if (process.env.NODE_ENV === 'test') {
        console.log('Running in test mode - using fallback users');
        return;
      }

      // Migrate fallback users to DynamoDB if they don't exist
      for (const user of this.fallbackUsers) {
        try {
          const existingUser = await this.userRepository.findByUsername(user.username);
          if (!existingUser) {
            await this.userRepository.createUser(user);
            console.log(`Migrated user: ${user.username}`);
          }
        } catch (error) {
          console.warn(`Failed to migrate user ${user.username}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('Database initialization warning:', error.message);
      console.log('Falling back to in-memory users for development');
    }
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.findOneByUsername(username);
  }

  async findOneByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await this.userRepository.findByUsername(username);
      return user || undefined;
    } catch (error) {
      console.warn('Repository get failed, using fallback:', error.message);
      return this.fallbackUsers.find((user) => user.username === username);
    }
  }

  // Removed createUserInDatabase - now handled by repository

  async createUser(createUserDto: CreateUserDto) {
    try {
      // Check if user already exists
      const existingUser = await this.findOneByUsername(createUserDto.username);
      if (existingUser) {
        throw new HttpException(
          'Username already exists.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if email already exists
      const existingEmailUser = await this.userRepository.findByEmail(createUserDto.email);
      if (existingEmailUser) {
        throw new HttpException(
          'Email already exists.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Hash password with configurable salt rounds
      const salt = bcrypt.genSaltSync(this.saltRounds);
      const hashedPassword = bcrypt.hashSync(createUserDto.password, salt);

      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        roles: ['user'],
        patches: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to DynamoDB
      await this.userRepository.createUser(newUser);
      
      console.log('User created successfully:', { username: newUser.username, email: newUser.email });

      // Return user without password for security
      const { password, ...userWithoutPassword } = newUser;
      return { ok: true, data: userWithoutPassword };

    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      // Fallback to in-memory for development
      if (error.name === 'ResourceNotFoundException' || process.env.NODE_ENV === 'test') {
        console.warn('DynamoDB not available, using fallback user creation');
        return this.createUserFallback(createUserDto);
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  private async createUserFallback(createUserDto: CreateUserDto) {
    const existingUser = this.fallbackUsers.find(user => user.username === createUserDto.username);
    if (existingUser) {
      throw new HttpException('Username already exists.', HttpStatus.BAD_REQUEST);
    }

    const salt = bcrypt.genSaltSync(this.saltRounds);
    const hashedPassword = bcrypt.hashSync(createUserDto.password, salt);

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: createUserDto.username,
      email: createUserDto.email,
      password: hashedPassword,
      roles: ['user'],
      patches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.fallbackUsers.push(newUser);
    
    const { password, ...userWithoutPassword } = newUser;
    return { ok: true, data: userWithoutPassword };
  }

  // Removed findUserByEmail - now using userRepository.findByEmail directly

  async getUserByUsername(username: string) {
    try {
      const user = await this.findOneByUsername(username);
      
      if (!user) {
        return { ok: false, data: [] };
      }

      console.log(`Found user: ${username}`);
      return { ok: true, data: [user] };

    } catch (error) {
      console.error('Error getting user:', error);
      return { ok: false, data: [], error: error.message };
    }
  }
}

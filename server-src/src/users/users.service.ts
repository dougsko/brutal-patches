import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from './dto/create-user-dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly saltRounds = 12; // Configurable salt rounds for bcrypt

  // Fallback users for development when DynamoDB is not available
  private readonly fallbackUsers: User[] = [
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
    {
      username: 'dougsko',
      password: '$2a$10$8xPHnOJ/u/hTEhwUEmW6heUKAsA6o3i.lx4oLg9ylcQLALR79de6i', // 'changeme'
      email: 'dougsko@gmail.com',
      roles: ['admin'],
      patches: [567, 623],
    },
  ];

  constructor() {
    // Initialize DynamoDB client
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.USERS_TABLE_NAME || 'UsersTable-dev';

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
        const existingUser = await this.findOneByUsername(user.username);
        if (!existingUser) {
          await this.createUserInDatabase(user);
          console.log(`Migrated user: ${user.username}`);
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
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { username },
      });

      const result = await this.dynamoClient.send(command);
      return result.Item as User;
    } catch (error) {
      console.warn('DynamoDB query failed, using fallback:', error.message);
      return this.fallbackUsers.find((user) => user.username === username);
    }
  }

  private async createUserInDatabase(user: User): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: user,
      ConditionExpression: 'attribute_not_exists(username)', // Prevent overwriting
    });

    await this.dynamoClient.send(command);
  }

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
      const existingEmailUser = await this.findUserByEmail(createUserDto.email);
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
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        roles: ['user'],
        patches: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to DynamoDB
      await this.createUserInDatabase(newUser);
      
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

  private async findUserByEmail(email: string): Promise<User | undefined> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      });

      const result = await this.dynamoClient.send(command);
      return result.Items && result.Items.length > 0 ? result.Items[0] as User : undefined;
    } catch (error) {
      console.warn('Email query failed, using fallback:', error.message);
      return this.fallbackUsers.find((user) => user.email === email);
    }
  }

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

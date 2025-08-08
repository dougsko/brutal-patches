import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../common/logger.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;
  let mockLoggerService: Partial<LoggerService>;

  beforeEach(async () => {
    mockUsersService = {
      getUserByUsername: jest.fn().mockResolvedValue({
        data: [
          {
            username: 'testuser',
            password: '$2a$10$test.hash.password',
            email: 'test@example.com',
          },
        ],
      }),
      findOne: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      logAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate user with correct credentials', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcryptjs');
    const mockHash = bcrypt.hashSync('testpass', 10);

    mockUsersService.getUserByUsername = jest.fn().mockResolvedValue({
      data: [
        {
          username: 'testuser',
          password: mockHash,
          email: 'test@example.com',
        },
      ],
    });

    const result = await service.validateUser('testuser', 'testpass');
    expect(result).toBeTruthy();
    expect(mockUsersService.getUserByUsername).toHaveBeenCalledWith('testuser');
  });

  it('should throw exception for invalid credentials', async () => {
    const mockHash = require('bcryptjs').hashSync('correctpass', 10);

    mockUsersService.getUserByUsername = jest.fn().mockResolvedValue({
      data: [
        {
          username: 'testuser',
          password: mockHash,
          email: 'test@example.com',
        },
      ],
    });

    await expect(
      service.validateUser('testuser', 'wrongpass'),
    ).rejects.toThrow();
  });

  it('should throw exception for user not found', async () => {
    mockUsersService.getUserByUsername = jest.fn().mockResolvedValue({
      data: [],
    });

    await expect(
      service.validateUser('nonexistent', 'password'),
    ).rejects.toThrow();
  });
});

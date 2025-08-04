import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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

  it('should return null for invalid credentials', async () => {
    mockUsersService.getUserByUsername = jest.fn().mockResolvedValue({
      data: [
        {
          username: 'testuser',
          password: '$2a$10$different.hash',
          email: 'test@example.com',
        },
      ],
    });

    const result = await service.validateUser('testuser', 'wrongpass');
    expect(result).toBeNull();
  });
});

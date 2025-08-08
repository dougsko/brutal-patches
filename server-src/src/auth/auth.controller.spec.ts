import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '../common/logger.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockLoggerService: Partial<LoggerService>;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn().mockResolvedValue({
        access_token: 'mock-token',
      }),
      validateUser: jest.fn(),
    };

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login user and return token', async () => {
    const mockUser = { username: 'testuser', email: 'test@example.com' };
    const mockReq = { user: mockUser };
    const mockLoginDto = { username: 'testuser', password: 'testpass' };

    const result = await controller.login(mockReq, mockLoginDto);

    expect(result).toEqual({ access_token: 'mock-token' });
    expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
  });
});

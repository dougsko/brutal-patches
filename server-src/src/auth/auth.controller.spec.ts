import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn().mockResolvedValue({
        access_token: 'mock-token',
      }),
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login user and return token', async () => {
    const mockUser = { username: 'testuser', email: 'test@example.com' };
    const mockReq = { user: mockUser };

    const result = await controller.login(mockReq);

    expect(result).toEqual({ access_token: 'mock-token' });
    expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
  });
});

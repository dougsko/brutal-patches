import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    mockUsersService = {
      createUser: jest.fn().mockResolvedValue({
        ok: true,
        data: { username: 'testuser', email: 'test@example.com' },
      }),
      findOne: jest.fn(),
      getUserByUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const createUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass',
    };

    const result = await controller.createUser(createUserDto);

    expect(mockUsersService.createUser).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual({
      ok: true,
      data: { username: 'testuser', email: 'test@example.com' },
    });
  });
});

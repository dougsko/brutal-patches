import { Test, TestingModule } from '@nestjs/testing';
import { PatchService } from './patch.service';
import { UsersService } from '../users/users.service';

describe('PatchService', () => {
  let service: PatchService;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    mockUsersService = {
      findOne: jest.fn(),
      createUser: jest.fn(),
      getUserByUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatchService,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<PatchService>(PatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get all patches', async () => {
    const result = await service.getAllPatches();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should get patch by id', async () => {
    const patches = await service.getAllPatches();
    if (patches.length > 0) {
      const firstPatchId = patches[0].id.toString();
      const result = await service.getPatch(firstPatchId);
      expect(result).toBeDefined();
      expect(result.id).toBe(patches[0].id);
    }
  });
});

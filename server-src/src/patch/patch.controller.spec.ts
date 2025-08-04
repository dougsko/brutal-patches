import { Test, TestingModule } from '@nestjs/testing';
import { PatchController } from './patch.controller';
import { PatchService } from './patch.service';

describe('PatchController', () => {
  let controller: PatchController;
  let mockPatchService: Partial<PatchService>;

  beforeEach(async () => {
    mockPatchService = {
      getAllPatches: jest
        .fn()
        .mockResolvedValue([
          { id: 1, title: 'Test Patch', description: 'A test patch' },
        ]),
      getPatchTotal: jest.fn().mockResolvedValue(10),
      getPatch: jest.fn(),
      getLatestPatches: jest.fn(),
      getPatchesByUser: jest.fn(),
      getUserPatchTotal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatchController],
      providers: [{ provide: PatchService, useValue: mockPatchService }],
    }).compile();

    controller = module.get<PatchController>(PatchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all patches', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([
      { id: 1, title: 'Test Patch', description: 'A test patch' },
    ]);
    expect(mockPatchService.getAllPatches).toHaveBeenCalled();
  });

  it('should get patch total', async () => {
    const result = await controller.getTotal();
    expect(result).toBe(10);
    expect(mockPatchService.getPatchTotal).toHaveBeenCalled();
  });
});

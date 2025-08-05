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
      createPatch: jest.fn(),
      updatePatch: jest.fn(),
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

  describe('POST /api/patches', () => {
    it('should create a new patch', async () => {
      const mockUser = { username: 'testuser' };
      const mockPatchData = {
        id: 0,
        title: 'New Patch',
        description: 'Test patch',
        sub_fifth: 0,
        overtone: 0,
        ultra_saw: 0,
        saw: 0,
        pulse_width: 0,
        square: 0,
        metalizer: 0,
        triangle: 0,
        cutoff: 0,
        mode: 0,
        resonance: 0,
        env_amt: 0,
        brute_factor: 0,
        kbd_tracking: 0,
        modmatrix: [],
        octave: 0,
        volume: 0,
        glide: 0,
        mod_wheel: 0,
        amount: 0,
        wave: 0,
        rate: 0,
        sync: 0,
        env_amt_2: 0,
        vca: 0,
        attack: 0,
        decay: 0,
        sustain: 0,
        release: 0,
        pattern: 0,
        play: 0,
        rate_2: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        average_rating: '0',
        tags: [],
      };
      const expectedResult = { ...mockPatchData, id: 123 };

      mockPatchService.createPatch = jest.fn().mockResolvedValue(expectedResult);

      const result = await controller.create({ user: mockUser }, mockPatchData);

      expect(result).toEqual(expectedResult);
      expect(mockPatchService.createPatch).toHaveBeenCalledWith('testuser', mockPatchData);
    });

    it('should handle patch creation errors', async () => {
      const mockUser = { username: 'testuser' };
      const mockPatchData = { title: '' }; // Invalid patch data

      mockPatchService.createPatch = jest.fn().mockRejectedValue(new Error('Patch title is required'));

      await expect(controller.create({ user: mockUser }, mockPatchData as any))
        .rejects.toThrow('Patch title is required');
    });
  });

  describe('PUT /api/patches/:id', () => {
    it('should update an existing patch', async () => {
      const mockUser = { username: 'testuser' };
      const patchId = '123';
      const mockPatchData = {
        id: 123,
        title: 'Updated Patch',
        description: 'Updated description',
      };
      const expectedResult = { ...mockPatchData, updated_at: new Date().toISOString() };

      mockPatchService.updatePatch = jest.fn().mockResolvedValue(expectedResult);

      const result = await controller.update({ user: mockUser }, patchId, mockPatchData as any);

      expect(result).toEqual(expectedResult);
      expect(mockPatchService.updatePatch).toHaveBeenCalledWith('testuser', patchId, mockPatchData);
    });

    it('should handle patch update errors', async () => {
      const mockUser = { username: 'testuser' };
      const patchId = '999';
      const mockPatchData = { title: 'Updated Patch' };

      mockPatchService.updatePatch = jest.fn().mockRejectedValue(new Error('Patch not found'));

      await expect(controller.update({ user: mockUser }, patchId, mockPatchData as any))
        .rejects.toThrow('Patch not found');
    });

    it('should handle unauthorized update attempts', async () => {
      const mockUser = { username: 'otheruser' };
      const patchId = '123';
      const mockPatchData = { title: 'Updated Patch' };

      mockPatchService.updatePatch = jest.fn().mockRejectedValue(new Error('Unauthorized to modify this patch'));

      await expect(controller.update({ user: mockUser }, patchId, mockPatchData as any))
        .rejects.toThrow('Unauthorized to modify this patch');
    });
  });
});

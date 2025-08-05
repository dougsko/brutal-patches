import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
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
      findOneByUsername: jest.fn(),
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

  describe('createPatch', () => {
    it('should create a new patch successfully', async () => {
      const username = 'testuser';
      const mockUser = {
        username,
        patches: [1, 2],
        email: 'test@example.com',
        password: 'hashedpassword',
        roles: ['user'],
      };
      const patchData = {
        id: 0,
        title: 'Test Patch',
        description: 'A test patch',
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

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      const result = await service.createPatch(username, patchData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Patch');
      expect(result.id).toBeGreaterThan(0);
      expect(mockUsersService.findOneByUsername).toHaveBeenCalledWith(username);
      expect(mockUser.patches).toContain(result.id);
    });

    it('should throw error if user not found', async () => {
      const username = 'nonexistentuser';
      const patchData = { title: 'Test Patch' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(null);

      await expect(service.createPatch(username, patchData))
        .rejects.toThrow(new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND));
    });

    it('should throw error if patch title is empty', async () => {
      const username = 'testuser';
      const mockUser = { username, patches: [] };
      const patchData = { title: '' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      await expect(service.createPatch(username, patchData))
        .rejects.toThrow(new HttpException('Patch title is required', HttpStatus.BAD_REQUEST));
    });

    it('should throw error if patch title is null', async () => {
      const username = 'testuser';
      const mockUser = { username, patches: [] };
      const patchData = { title: null } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      await expect(service.createPatch(username, patchData))
        .rejects.toThrow(new HttpException('Patch title is required', HttpStatus.BAD_REQUEST));
    });
  });

  describe('updatePatch', () => {
    it('should update an existing patch successfully', async () => {
      const username = 'testuser';
      
      // Get existing patches to find a valid ID
      const existingPatches = await service.getAllPatches();
      expect(existingPatches.length).toBeGreaterThan(0);
      
      const firstPatch = existingPatches[0];
      const patchId = firstPatch.id.toString();
      const mockUser = {
        username,
        patches: [firstPatch.id], // User owns the first patch
        email: 'test@example.com',
        password: 'hashedpassword',
        roles: ['user'],
      };
      const updateData = {
        title: 'Updated Patch',
        description: 'Updated description',
      } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      const result = await service.updatePatch(username, patchId, updateData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Patch');
      expect(result.description).toBe('Updated description');
      expect(result.id).toBe(firstPatch.id);
      expect(mockUsersService.findOneByUsername).toHaveBeenCalledWith(username);
    });

    it('should throw error if user not found', async () => {
      const username = 'nonexistentuser';
      const patchId = '1';
      const updateData = { title: 'Updated Patch' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(null);

      await expect(service.updatePatch(username, patchId, updateData))
        .rejects.toThrow(new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND));
    });

    it('should throw error if patch not found', async () => {
      const username = 'testuser';
      const patchId = '999999';
      const mockUser = { username, patches: [1, 2] };
      const updateData = { title: 'Updated Patch' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      await expect(service.updatePatch(username, patchId, updateData))
        .rejects.toThrow(new HttpException('Patch not found', HttpStatus.NOT_FOUND));
    });

    it('should throw error if user does not own the patch', async () => {
      const username = 'testuser';
      
      // Get existing patches to find a valid ID
      const existingPatches = await service.getAllPatches();
      expect(existingPatches.length).toBeGreaterThan(0);
      
      const firstPatch = existingPatches[0];
      const patchId = firstPatch.id.toString();
      const mockUser = {
        username,
        patches: [999999], // User doesn't own the first patch
      };
      const updateData = { title: 'Updated Patch' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      await expect(service.updatePatch(username, patchId, updateData))
        .rejects.toThrow(new HttpException('Unauthorized to modify this patch', HttpStatus.FORBIDDEN));
    });

    it('should throw error if updated title is empty', async () => {
      const username = 'testuser';
      
      // Get existing patches to find a valid ID
      const existingPatches = await service.getAllPatches();
      expect(existingPatches.length).toBeGreaterThan(0);
      
      const firstPatch = existingPatches[0];
      const patchId = firstPatch.id.toString();
      const mockUser = { username, patches: [firstPatch.id] };
      const updateData = { title: '' } as any;

      mockUsersService.findOneByUsername = jest.fn().mockResolvedValue(mockUser);

      await expect(service.updatePatch(username, patchId, updateData))
        .rejects.toThrow(new HttpException('Patch title is required', HttpStatus.BAD_REQUEST));
    });
  });
});

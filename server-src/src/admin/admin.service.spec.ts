import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { PatchService } from '../patch/patch.service';
import { PatchRepository } from '../patch/patch.repository';
import { PatchCollectionRepository } from '../patch/patch-collection.repository';
import { BulkOperationsService } from './bulk-operations.service';

const mockUsersService = {
  findOneByUsername: jest.fn(),
  findAll: jest.fn(),
};

const mockPatchService = {
  getAllPatches: jest.fn(),
  getPatchCategories: jest.fn(),
  createPatch: jest.fn(),
  updatePatch: jest.fn(),
  deletePatch: jest.fn(),
};

const mockPatchRepository = {
  getPatchStats: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
};

const mockCollectionRepository = {
  getCollectionStats: jest.fn(),
  getPublicCollections: jest.fn(),
};

const mockBulkOperationsService = {
  exportPatches: jest.fn(),
  importPatches: jest.fn(),
  deletePatches: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;
  let usersService: jest.Mocked<UsersService>;
  let patchService: jest.Mocked<PatchService>;
  let patchRepository: jest.Mocked<PatchRepository>;
  let collectionRepository: jest.Mocked<PatchCollectionRepository>;
  let bulkOperationsService: jest.Mocked<BulkOperationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PatchService,
          useValue: mockPatchService,
        },
        {
          provide: PatchRepository,
          useValue: mockPatchRepository,
        },
        {
          provide: PatchCollectionRepository,
          useValue: mockCollectionRepository,
        },
        {
          provide: BulkOperationsService,
          useValue: mockBulkOperationsService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    usersService = module.get<UsersService>(
      UsersService,
    ) as jest.Mocked<UsersService>;
    patchService = module.get<PatchService>(
      PatchService,
    ) as jest.Mocked<PatchService>;
    patchRepository = module.get<PatchRepository>(
      PatchRepository,
    ) as jest.Mocked<PatchRepository>;
    collectionRepository = module.get<PatchCollectionRepository>(
      PatchCollectionRepository,
    ) as jest.Mocked<PatchCollectionRepository>;
    bulkOperationsService = module.get<BulkOperationsService>(
      BulkOperationsService,
    ) as jest.Mocked<BulkOperationsService>;

    // Reset mocks before each test
    Object.values(mockUsersService).forEach((mock) => mock.mockReset());
    Object.values(mockPatchService).forEach((mock) => mock.mockReset());
    Object.values(mockPatchRepository).forEach((mock) => mock.mockReset());
    Object.values(mockCollectionRepository).forEach((mock) => mock.mockReset());
    Object.values(mockBulkOperationsService).forEach((mock) =>
      mock.mockReset(),
    );
  });

  describe('getAdminStats', () => {
    it('should return comprehensive admin statistics', async () => {
      const mockPatchStats = {
        totalPatches: 150,
        averageRating: 4.2,
        topCategories: [
          { category: 'bass', count: 45 },
          { category: 'lead', count: 35 },
          { category: 'pad', count: 25 },
        ],
      };

      const mockCollectionStats = {
        totalCollections: 25,
        publicCollections: 15,
        privateCollections: 10,
        averagePatchCount: 6.2,
      };

      // Mock the getUserStats method (private method would need to be tested differently in real scenarios)
      jest.spyOn(service as any, 'getUserStats').mockResolvedValueOnce({
        total: 50,
        activeUsers: 25,
        newUsersThisWeek: 5,
        newUsersThisMonth: 12,
      });

      mockPatchRepository.getPatchStats.mockResolvedValueOnce(mockPatchStats);
      mockCollectionRepository.getCollectionStats.mockResolvedValueOnce(
        mockCollectionStats,
      );

      const result = await service.getAdminStats();

      expect(result).toEqual({
        users: {
          total: 50,
          activeUsers: 25,
          newUsersThisWeek: 5,
          newUsersThisMonth: 12,
        },
        patches: {
          total: 150,
          newPatchesThisWeek: 0,
          newPatchesThisMonth: 0,
          averageRating: 4.2,
          topCategories: [
            { category: 'bass', count: 45 },
            { category: 'lead', count: 35 },
            { category: 'pad', count: 25 },
          ],
        },
        collections: {
          total: 25,
          publicCollections: 15,
          privateCollections: 10,
          averagePatchCount: 6.2,
        },
        activity: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
        },
      });

      expect(mockPatchRepository.getPatchStats).toHaveBeenCalledTimes(1);
      expect(mockCollectionRepository.getCollectionStats).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should handle errors when getting statistics', async () => {
      jest
        .spyOn(service as any, 'getUserStats')
        .mockRejectedValueOnce(new Error('User stats error'));

      await expect(service.getAdminStats()).rejects.toThrow(
        'Failed to get admin statistics',
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health with healthy status', async () => {
      mockPatchRepository.count.mockResolvedValueOnce(100);

      const result = await service.getSystemHealth();

      expect(result).toMatchObject({
        status: expect.any(String),
        database: {
          status: 'connected',
          responseTime: expect.any(Number),
        },
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
        uptime: expect.any(Number),
        errors: {
          count: 0,
          recentErrors: [],
        },
      });

      expect(result.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockPatchRepository.count).toHaveBeenCalledTimes(1);
    });

    it('should return critical status when database is disconnected', async () => {
      mockPatchRepository.count.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const result = await service.getSystemHealth();

      expect(result.status).toBe('critical'); // Database error causes critical status
      expect(result.database.status).toBe('disconnected');
    });

    it('should return warning status for slow database response', async () => {
      // Mock a slow response (over 1000ms)
      mockPatchRepository.count.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(100), 1100)),
      );

      const result = await service.getSystemHealth();

      expect(result.database.status).toBe('slow');
      expect(result.status).toBe('warning');
    });
  });

  describe('getContentModerationQueue', () => {
    it('should return empty moderation queue', async () => {
      const result = await service.getContentModerationQueue();

      expect(result).toEqual([]);
    });
  });

  describe('moderateContent', () => {
    it('should approve content successfully', async () => {
      const itemId = 'patch-123';
      const action = 'approve';
      const moderatorUsername = 'admin';
      const notes = 'Content looks good';

      const result = await service.moderateContent(
        itemId,
        action,
        moderatorUsername,
        notes,
      );

      expect(result).toEqual({
        success: true,
        message: `Content ${itemId} has been ${action}ed by ${moderatorUsername}`,
      });
    });

    it('should reject content successfully', async () => {
      const itemId = 'patch-456';
      const action = 'reject';
      const moderatorUsername = 'admin';

      const result = await service.moderateContent(
        itemId,
        action,
        moderatorUsername,
      );

      expect(result).toEqual({
        success: true,
        message: `Content ${itemId} has been ${action}ed by ${moderatorUsername}`,
      });
    });
  });

  describe('getUserManagement', () => {
    it('should return user management data with default values', async () => {
      const result = await service.getUserManagement({
        search: 'test',
        sortBy: 'username',
        sortOrder: 'asc',
        limit: 50,
        offset: 0,
      });

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });
  });

  describe('moderateUser', () => {
    it('should suspend user successfully', async () => {
      const userId = 123;
      const action = 'suspend';
      const moderatorUsername = 'admin';
      const reason = 'Violation of terms of service';

      const result = await service.moderateUser(
        userId,
        action,
        moderatorUsername,
        reason,
      );

      expect(result).toEqual({
        success: true,
        message: `User ${userId} has been ${action}d by ${moderatorUsername}`,
      });
    });

    it('should activate user successfully', async () => {
      const userId = 123;
      const action = 'activate';
      const moderatorUsername = 'admin';

      const result = await service.moderateUser(
        userId,
        action,
        moderatorUsername,
      );

      expect(result).toEqual({
        success: true,
        message: `User ${userId} has been ${action}d by ${moderatorUsername}`,
      });
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data for 30 day period', async () => {
      mockPatchService.getPatchCategories.mockResolvedValueOnce([
        {
          id: 'bass',
          name: 'Bass',
          description: 'Bass patches',
          color: '#ff0000',
        },
        {
          id: 'lead',
          name: 'Lead',
          description: 'Lead patches',
          color: '#00ff00',
        },
      ]);

      const result = await service.getAnalytics('30d');

      expect(result).toMatchObject({
        userGrowth: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            count: expect.any(Number),
          }),
        ]),
        patchActivity: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            created: expect.any(Number),
            updated: expect.any(Number),
          }),
        ]),
        categoryDistribution: expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            count: expect.any(Number),
          }),
        ]),
        ratingDistribution: expect.arrayContaining([
          expect.objectContaining({
            rating: expect.any(Number),
            count: expect.any(Number),
          }),
        ]),
      });

      expect(result.userGrowth).toHaveLength(30);
      expect(result.patchActivity).toHaveLength(30);
      expect(mockPatchService.getPatchCategories).toHaveBeenCalledTimes(1);
    });

    it('should handle different time ranges', async () => {
      mockPatchService.getPatchCategories.mockResolvedValueOnce([]);

      const result7d = await service.getAnalytics('7d');
      const result90d = await service.getAnalytics('90d');
      const result1y = await service.getAnalytics('1y');

      expect(result7d.userGrowth).toHaveLength(7);
      expect(result90d.userGrowth).toHaveLength(90);
      expect(result1y.userGrowth).toHaveLength(365);
    });
  });

  describe('exportData', () => {
    it('should export patches data in JSON format', async () => {
      const mockPatches = [
        { id: 1, title: 'Patch 1', description: 'Test patch 1' },
        { id: 2, title: 'Patch 2', description: 'Test patch 2' },
      ];

      mockPatchService.getAllPatches.mockResolvedValueOnce(mockPatches);

      const result = await service.exportData('patches', 'json');

      expect(result).toMatchObject({
        filename: expect.stringMatching(/^patches_export_\d+\.json$/),
        data: mockPatches,
        contentType: 'application/json',
      });

      expect(mockPatchService.getAllPatches).toHaveBeenCalledTimes(1);
    });

    it('should export collections data in JSON format', async () => {
      const mockCollections = {
        items: [
          { id: 1, name: 'Collection 1', description: 'Test collection 1' },
          { id: 2, name: 'Collection 2', description: 'Test collection 2' },
        ],
      };

      mockCollectionRepository.getPublicCollections.mockResolvedValueOnce(
        mockCollections,
      );

      const result = await service.exportData('collections', 'json');

      expect(result).toMatchObject({
        filename: expect.stringMatching(/^collections_export_\d+\.json$/),
        data: mockCollections,
        contentType: 'application/json',
      });
    });

    it('should export all data in JSON format', async () => {
      const mockPatches = [{ id: 1, title: 'Patch 1' }];
      const mockCollections = { items: [{ id: 1, name: 'Collection 1' }] };

      mockPatchService.getAllPatches.mockResolvedValueOnce(mockPatches);
      mockCollectionRepository.getPublicCollections.mockResolvedValueOnce(
        mockCollections,
      );

      const result = await service.exportData('all', 'json');

      expect(result).toMatchObject({
        filename: expect.stringMatching(/^full_export_\d+\.json$/),
        data: expect.objectContaining({
          users: [],
          patches: mockPatches,
          collections: mockCollections.items,
          exportedAt: expect.any(String),
        }),
        contentType: 'application/json',
      });
    });

    it('should handle CSV format export', async () => {
      const mockPatches = [
        { id: 1, title: 'Patch 1', description: 'Test patch 1' },
        { id: 2, title: 'Patch 2', description: 'Test patch 2' },
      ];

      mockPatchService.getAllPatches.mockResolvedValueOnce(mockPatches);
      jest
        .spyOn(service as any, 'convertToCSV')
        .mockReturnValueOnce(
          'id,title,description\n1,Patch 1,Test patch 1\n2,Patch 2,Test patch 2',
        );

      const result = await service.exportData('patches', 'csv');

      expect(result).toMatchObject({
        filename: expect.stringMatching(/^patches_export_\d+\.csv$/),
        data: 'id,title,description\n1,Patch 1,Test patch 1\n2,Patch 2,Test patch 2',
        contentType: 'text/csv',
      });
    });

    it('should handle invalid export type', async () => {
      await expect(
        service.exportData('invalid' as any, 'json'),
      ).rejects.toThrow('Invalid export type');
    });
  });
});

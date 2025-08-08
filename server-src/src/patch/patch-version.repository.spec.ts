import { Test, TestingModule } from '@nestjs/testing';
import { PatchVersionRepository } from './patch-version.repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { PatchVersion } from '../interfaces/patch.interface';

const mockDynamoService = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  queryItems: jest.fn(),
  scanItems: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  paginatedScan: jest.fn(),
  batchGet: jest.fn(),
  batchWrite: jest.fn(),
};

describe('PatchVersionRepository', () => {
  let repository: PatchVersionRepository;
  let dynamoService: jest.Mocked<DynamoDBService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatchVersionRepository,
        {
          provide: DynamoDBService,
          useValue: mockDynamoService,
        },
      ],
    }).compile();

    repository = module.get<PatchVersionRepository>(PatchVersionRepository);
    dynamoService = module.get<DynamoDBService>(
      DynamoDBService,
    ) as jest.Mocked<DynamoDBService>;

    // Reset mocks before each test
    Object.values(mockDynamoService).forEach((mock) => mock.mockReset());
  });

  describe('createVersion', () => {
    it('should create a new patch version successfully', async () => {
      const versionData = {
        patchId: 123,
        version: 1,
        title: 'Test Patch',
        description: 'A test patch',
        changes: 'Initial version',
        patchData: {
          cutoff: 0.5,
          resonance: 0.3,
          attack: 0.1,
        } as any,
        created_at: new Date().toISOString(),
        created_by: 'testuser',
      };

      mockDynamoService.putItem.mockResolvedValueOnce(undefined);

      const result = await repository.createVersion(versionData);

      expect(result).toMatchObject({
        ...versionData,
        id: expect.any(Number),
        created_at: expect.any(String),
      });
      expect(mockDynamoService.putItem).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...versionData,
          id: expect.any(Number),
        }),
        expect.any(Object),
      );
    });

    it('should handle creation errors', async () => {
      const versionData = {
        patchId: 123,
        version: 1,
        title: 'Test Patch',
        description: 'A test patch',
        changes: 'Initial version',
        patchData: {} as any,
        created_at: new Date().toISOString(),
        created_by: 'testuser',
      };

      mockDynamoService.putItem.mockRejectedValueOnce(
        new Error('DynamoDB error'),
      );

      await expect(repository.createVersion(versionData)).rejects.toThrow(
        'DynamoDB error',
      );
    });
  });

  describe('getPatchHistory', () => {
    it('should retrieve patch history successfully', async () => {
      const patchId = 123;
      const mockVersions: PatchVersion[] = [
        {
          id: 1,
          patchId,
          version: 2,
          title: 'Test Patch v2',
          description: 'Updated patch',
          changes: 'Updated cutoff frequency',
          patchData: {} as any,
          created_at: '2023-01-02T00:00:00Z',
          created_by: 'testuser',
        },
        {
          id: 2,
          patchId,
          version: 1,
          title: 'Test Patch v1',
          description: 'Initial patch',
          changes: 'Initial version',
          patchData: {} as any,
          created_at: '2023-01-01T00:00:00Z',
          created_by: 'testuser',
        },
      ];

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: mockVersions,
        count: 2,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getPatchHistory(patchId);

      expect(result).toEqual({
        patchId,
        versions: mockVersions,
        totalVersions: 2,
      });

      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'patchId = :patchId',
        { ':patchId': patchId },
        expect.objectContaining({
          scanIndexForward: false,
        }),
      );
    });
  });

  describe('getPatchVersion', () => {
    it('should retrieve a specific patch version', async () => {
      const patchId = 123;
      const version = 2;
      const mockVersion: PatchVersion = {
        id: 1,
        patchId,
        version,
        title: 'Test Patch v2',
        description: 'Updated patch',
        changes: 'Updated cutoff frequency',
        patchData: {} as any,
        created_at: '2023-01-02T00:00:00Z',
        created_by: 'testuser',
      };

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: [mockVersion],
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getPatchVersion(patchId, version);

      expect(result).toEqual(mockVersion);
      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'patchId = :patchId AND version = :version',
        { ':patchId': patchId, ':version': version },
        expect.objectContaining({
          indexName: 'PatchIndex',
        }),
      );
    });

    it('should return null when version not found', async () => {
      const patchId = 123;
      const version = 999;

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getPatchVersion(patchId, version);

      expect(result).toBeNull();
    });
  });

  describe('getLatestVersionNumber', () => {
    it('should return latest version number', async () => {
      const patchId = 123;
      const mockVersion: PatchVersion = {
        id: 1,
        patchId,
        version: 5,
        title: 'Test Patch v5',
        description: 'Latest patch',
        changes: 'Latest changes',
        patchData: {} as any,
        created_at: '2023-01-05T00:00:00Z',
        created_by: 'testuser',
      };

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: [mockVersion],
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getLatestVersionNumber(patchId);

      expect(result).toBe(5);
      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'patchId = :patchId',
        { ':patchId': patchId },
        expect.objectContaining({
          scanIndexForward: false,
          limit: 1,
          projectionExpression: 'version',
        }),
      );
    });

    it('should return 0 when no versions exist', async () => {
      const patchId = 123;

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: [],
        count: 0,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getLatestVersionNumber(patchId);

      expect(result).toBe(0);
    });
  });

  describe('compareVersions', () => {
    it('should compare two patch versions and return differences', async () => {
      const patchId = 123;
      const version1 = 1;
      const version2 = 2;

      const mockVersion1: PatchVersion = {
        id: 1,
        patchId,
        version: version1,
        title: 'Test Patch v1',
        description: 'Initial patch',
        changes: 'Initial version',
        patchData: {
          cutoff: 0.5,
          resonance: 0.3,
          attack: 0.1,
        } as any,
        created_at: '2023-01-01T00:00:00Z',
        created_by: 'testuser',
      };

      const mockVersion2: PatchVersion = {
        id: 2,
        patchId,
        version: version2,
        title: 'Test Patch v2',
        description: 'Updated patch',
        changes: 'Updated cutoff frequency',
        patchData: {
          cutoff: 0.7,
          resonance: 0.3,
          attack: 0.2,
        } as any,
        created_at: '2023-01-02T00:00:00Z',
        created_by: 'testuser',
      };

      // Mock two separate calls to getPatchVersion
      jest
        .spyOn(repository, 'getPatchVersion')
        .mockResolvedValueOnce(mockVersion1)
        .mockResolvedValueOnce(mockVersion2);

      const result = await repository.compareVersions(
        patchId,
        version1,
        version2,
      );

      expect(result).toEqual({
        version1: mockVersion1,
        version2: mockVersion2,
        differences: [
          {
            field: 'cutoff',
            value1: 0.5,
            value2: 0.7,
            type: 'modified',
          },
          {
            field: 'attack',
            value1: 0.1,
            value2: 0.2,
            type: 'modified',
          },
        ],
      });
    });

    it('should handle comparison when one version is missing', async () => {
      const patchId = 123;
      const version1 = 1;
      const version2 = 999;

      jest
        .spyOn(repository, 'getPatchVersion')
        .mockResolvedValueOnce({} as PatchVersion)
        .mockResolvedValueOnce(null);

      const result = await repository.compareVersions(
        patchId,
        version1,
        version2,
      );

      expect(result.differences).toEqual([]);
    });
  });
});

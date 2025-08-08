import { Test, TestingModule } from '@nestjs/testing';
import { PatchCollectionRepository } from './patch-collection.repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { PatchCollection } from '../interfaces/patch.interface';

const mockDynamoService = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  queryItems: jest.fn(),
  scanItems: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  paginatedScan: jest.fn(),
};

describe('PatchCollectionRepository', () => {
  let repository: PatchCollectionRepository;
  let dynamoService: jest.Mocked<DynamoDBService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatchCollectionRepository,
        {
          provide: DynamoDBService,
          useValue: mockDynamoService,
        },
      ],
    }).compile();

    repository = module.get<PatchCollectionRepository>(PatchCollectionRepository);
    dynamoService = module.get<DynamoDBService>(DynamoDBService) as jest.Mocked<DynamoDBService>;

    // Reset mocks before each test
    Object.values(mockDynamoService).forEach(mock => mock.mockReset());
  });

  describe('createCollection', () => {
    it('should create a new patch collection successfully', async () => {
      const collectionData = {
        name: 'My Bass Collection',
        description: 'Collection of bass patches',
        userId: 123,
        patchIds: [1, 2, 3],
        isPublic: true,
        tags: ['bass', 'electronic'],
      };

      mockDynamoService.putItem.mockResolvedValueOnce(undefined);

      const result = await repository.createCollection(collectionData);

      expect(result).toMatchObject({
        ...collectionData,
        id: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      
      expect(mockDynamoService.putItem).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining(collectionData),
        expect.any(Object)
      );
    });
  });

  describe('getUserCollections', () => {
    it('should retrieve user collections successfully', async () => {
      const userId = 123;
      const mockCollections: PatchCollection[] = [
        {
          id: 1,
          name: 'Bass Collection',
          description: 'My bass patches',
          userId,
          patchIds: [1, 2, 3],
          isPublic: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          tags: ['bass'],
        },
        {
          id: 2,
          name: 'Lead Collection',
          description: 'My lead patches',
          userId,
          patchIds: [4, 5, 6],
          isPublic: false,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          tags: ['lead'],
        },
      ];

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: mockCollections,
        count: 2,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getUserCollections(userId, {
        includePrivate: true,
      });

      expect(result).toEqual({
        items: mockCollections,
        count: 2,
        lastEvaluatedKey: undefined,
      });

      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'userId = :userId',
        { ':userId': userId },
        expect.objectContaining({
          scanIndexForward: false,
        })
      );
    });

    it('should filter private collections when includePrivate is false', async () => {
      const userId = 123;
      const mockCollections: PatchCollection[] = [
        {
          id: 1,
          name: 'Public Collection',
          description: 'My public patches',
          userId,
          patchIds: [1, 2, 3],
          isPublic: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: mockCollections,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getUserCollections(userId, {
        includePrivate: false,
      });

      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'userId = :userId',
        expect.objectContaining({
          ':userId': userId,
          ':isPublic': true,
        }),
        expect.objectContaining({
          filterExpression: 'isPublic = :isPublic',
        })
      );
    });
  });

  describe('getPublicCollections', () => {
    it('should retrieve public collections successfully', async () => {
      const mockCollections: PatchCollection[] = [
        {
          id: 1,
          name: 'Community Bass Collection',
          description: 'Best bass patches',
          userId: 123,
          patchIds: [1, 2, 3],
          isPublic: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          tags: ['bass', 'community'],
        },
      ];

      mockDynamoService.queryItems.mockResolvedValueOnce({
        items: mockCollections,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.getPublicCollections();

      expect(result).toEqual({
        items: mockCollections,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      expect(mockDynamoService.queryItems).toHaveBeenCalledWith(
        expect.any(Object),
        'isPublic = :isPublic',
        { ':isPublic': true },
        expect.objectContaining({
          scanIndexForward: false,
        })
      );
    });
  });

  describe('addPatchToCollection', () => {
    it('should add patch to collection successfully', async () => {
      const collectionId = 1;
      const patchId = 10;
      const mockCollection: PatchCollection = {
        id: collectionId,
        name: 'Test Collection',
        description: 'Test description',
        userId: 123,
        patchIds: [1, 2, 3],
        isPublic: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const updatedCollection = {
        ...mockCollection,
        patchIds: [1, 2, 3, 10],
      };

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(mockCollection);
      jest.spyOn(repository, 'update').mockResolvedValueOnce(updatedCollection);

      const result = await repository.addPatchToCollection(collectionId, patchId);

      expect(result).toEqual(updatedCollection);
      expect(repository.update).toHaveBeenCalledWith(
        collectionId,
        { patchIds: [1, 2, 3, 10] }
      );
    });

    it('should not add duplicate patch to collection', async () => {
      const collectionId = 1;
      const patchId = 2; // Already exists in collection
      const mockCollection: PatchCollection = {
        id: collectionId,
        name: 'Test Collection',
        description: 'Test description',
        userId: 123,
        patchIds: [1, 2, 3],
        isPublic: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(mockCollection);

      const result = await repository.addPatchToCollection(collectionId, patchId);

      expect(result).toEqual(mockCollection);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw error when collection not found', async () => {
      const collectionId = 999;
      const patchId = 10;

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

      await expect(
        repository.addPatchToCollection(collectionId, patchId)
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('removePatchFromCollection', () => {
    it('should remove patch from collection successfully', async () => {
      const collectionId = 1;
      const patchId = 2;
      const mockCollection: PatchCollection = {
        id: collectionId,
        name: 'Test Collection',
        description: 'Test description',
        userId: 123,
        patchIds: [1, 2, 3],
        isPublic: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const updatedCollection = {
        ...mockCollection,
        patchIds: [1, 3],
      };

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(mockCollection);
      jest.spyOn(repository, 'update').mockResolvedValueOnce(updatedCollection);

      const result = await repository.removePatchFromCollection(collectionId, patchId);

      expect(result).toEqual(updatedCollection);
      expect(repository.update).toHaveBeenCalledWith(
        collectionId,
        { patchIds: [1, 3] }
      );
    });
  });

  describe('searchCollections', () => {
    it('should search collections by name and description', async () => {
      const searchTerm = 'bass';
      const mockCollections: PatchCollection[] = [
        {
          id: 1,
          name: 'Bass Collection',
          description: 'Collection of bass patches',
          userId: 123,
          patchIds: [1, 2, 3],
          isPublic: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          tags: ['bass'],
        },
      ];

      mockDynamoService.scanItems.mockResolvedValueOnce({
        items: mockCollections,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      const result = await repository.searchCollections(searchTerm, {
        publicOnly: true,
      });

      expect(result).toEqual({
        items: mockCollections,
        count: 1,
        lastEvaluatedKey: undefined,
      });

      expect(mockDynamoService.scanItems).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filterExpression: expect.stringContaining('contains(#name, :searchTerm)'),
          expressionAttributeNames: {
            '#name': 'name',
            '#description': 'description',
          },
          expressionAttributeValues: expect.objectContaining({
            ':searchTerm': 'bass',
            ':isPublic': true,
          }),
        })
      );
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      const mockCollections: PatchCollection[] = [
        {
          id: 1,
          name: 'Public Collection 1',
          description: 'Test',
          userId: 123,
          patchIds: [1, 2, 3],
          isPublic: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Private Collection 1',
          description: 'Test',
          userId: 123,
          patchIds: [4, 5],
          isPublic: false,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
        {
          id: 3,
          name: 'Public Collection 2',
          description: 'Test',
          userId: 456,
          patchIds: [6, 7, 8, 9],
          isPublic: true,
          created_at: '2023-01-03T00:00:00Z',
          updated_at: '2023-01-03T00:00:00Z',
        },
      ];

      mockDynamoService.paginatedScan.mockResolvedValueOnce({
        items: mockCollections,
        totalCount: 3,
      });

      const result = await repository.getCollectionStats();

      expect(result).toEqual({
        totalCollections: 3,
        publicCollections: 2,
        privateCollections: 1,
        averagePatchCount: 3, // (3 + 2 + 4) / 3 = 3
      });
    });
  });
});
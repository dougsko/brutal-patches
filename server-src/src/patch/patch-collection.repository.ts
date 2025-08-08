import { Injectable } from '@nestjs/common';
import { BaseRepository, RepositoryConfig } from '../common/database/base-repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { PatchCollection } from '../interfaces/patch.interface';

@Injectable()
export class PatchCollectionRepository extends BaseRepository<PatchCollection> {
  protected readonly config: RepositoryConfig = {
    tableName: process.env.PATCH_COLLECTIONS_TABLE_NAME || 'PatchCollectionsTable-dev',
    primaryKey: 'id',
    indexes: {
      UserIndex: {
        partitionKey: 'userId',
        sortKey: 'created_at',
      },
      PublicIndex: {
        partitionKey: 'isPublic',
        sortKey: 'created_at',
      },
    },
  };

  constructor(dynamoService: DynamoDBService) {
    super(dynamoService);
  }

  /**
   * Create a new patch collection
   */
  async createCollection(collectionData: Omit<PatchCollection, 'id' | 'created_at' | 'updated_at'>): Promise<PatchCollection> {
    try {
      const id = await this.generateCollectionId();
      const now = new Date().toISOString();
      
      const collection: PatchCollection = {
        ...collectionData,
        id,
        created_at: now,
        updated_at: now,
        patchIds: collectionData.patchIds || [],
      };

      return this.create(collection);
    } catch (error) {
      this.logger.error('Failed to create patch collection:', error);
      throw error;
    }
  }

  /**
   * Get collections by user
   */
  async getUserCollections(
    userId: string,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
      includePrivate?: boolean;
    }
  ): Promise<{ items: PatchCollection[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const expressionAttributeValues = !options?.includePrivate ? 
        { ':userId': userId, ':isPublic': true } : 
        { ':userId': userId };

      const result = await this.queryByIndex(
        'UserIndex',
        'userId = :userId',
        expressionAttributeValues,
        {
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
          scanIndexForward: false, // Newest first
          filterExpression: !options?.includePrivate ? 'isPublic = :isPublic' : undefined,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to get collections for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get public collections
   */
  async getPublicCollections(
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
    }
  ): Promise<{ items: PatchCollection[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.queryByIndex(
        'PublicIndex',
        'isPublic = :isPublic',
        { ':isPublic': true },
        {
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
          scanIndexForward: false, // Newest first
        }
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to get public collections:', error);
      throw error;
    }
  }

  /**
   * Add patch to collection
   */
  async addPatchToCollection(collectionId: number, patchId: number): Promise<PatchCollection | null> {
    try {
      const collection = await this.findById(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }

      if (!collection.patchIds.includes(patchId)) {
        const updatedPatchIds = [...collection.patchIds, patchId];
        return this.update(collectionId, { patchIds: updatedPatchIds });
      }

      return collection;
    } catch (error) {
      this.logger.error(`Failed to add patch ${patchId} to collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove patch from collection
   */
  async removePatchFromCollection(collectionId: number, patchId: number): Promise<PatchCollection | null> {
    try {
      const collection = await this.findById(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }

      const updatedPatchIds = collection.patchIds.filter(id => id !== patchId);
      return this.update(collectionId, { patchIds: updatedPatchIds });
    } catch (error) {
      this.logger.error(`Failed to remove patch ${patchId} from collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Update collection
   */
  async updateCollection(
    collectionId: number, 
    updates: Partial<Omit<PatchCollection, 'id' | 'created_at'>>
  ): Promise<PatchCollection | null> {
    try {
      return this.update(collectionId, updates);
    } catch (error) {
      this.logger.error(`Failed to update collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Search collections by name or description
   */
  async searchCollections(
    searchTerm: string,
    options?: {
      userId?: string;
      publicOnly?: boolean;
      limit?: number;
      exclusiveStartKey?: any;
    }
  ): Promise<{ items: PatchCollection[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      let filterExpression = 'contains(#name, :searchTerm) OR contains(#description, :searchTerm)';
      const expressionAttributeNames = {
        '#name': 'name',
        '#description': 'description',
      };
      const expressionAttributeValues: Record<string, any> = {
        ':searchTerm': searchTermLower,
      };

      if (options?.publicOnly !== false) {
        filterExpression += ' AND isPublic = :isPublic';
        expressionAttributeValues[':isPublic'] = true;
      }

      if (options?.userId) {
        filterExpression += ' AND userId = :userId';
        expressionAttributeValues[':userId'] = options.userId;
      }

      const result = await this.dynamoService.scanItems<PatchCollection>(
        this.getTableConfig(),
        {
          filterExpression,
          expressionAttributeNames,
          expressionAttributeValues,
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to search collections for term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<{
    totalCollections: number;
    publicCollections: number;
    privateCollections: number;
    averagePatchCount: number;
  }> {
    try {
      const result = await this.dynamoService.paginatedScan<PatchCollection>({
        TableName: this.config.tableName,
        ProjectionExpression: 'id, isPublic, patchIds',
      });

      const totalCollections = result.totalCount;
      const publicCollections = result.items.filter(c => c.isPublic).length;
      const privateCollections = totalCollections - publicCollections;
      
      const totalPatches = result.items.reduce((sum, collection) => 
        sum + (collection.patchIds?.length || 0), 0);
      const averagePatchCount = totalCollections > 0 ? 
        Math.round((totalPatches / totalCollections) * 100) / 100 : 0;

      return {
        totalCollections,
        publicCollections,
        privateCollections,
        averagePatchCount,
      };
    } catch (error) {
      this.logger.error('Failed to get collection statistics:', error);
      throw error;
    }
  }

  /**
   * Get collections containing a specific patch
   */
  async getCollectionsContainingPatch(
    patchId: number,
    options?: {
      userId?: string;
      publicOnly?: boolean;
      limit?: number;
    }
  ): Promise<{ items: PatchCollection[]; count: number }> {
    try {
      let filterExpression = 'contains(patchIds, :patchId)';
      const expressionAttributeValues: Record<string, any> = {
        ':patchId': patchId,
      };

      if (options?.publicOnly !== false) {
        filterExpression += ' AND isPublic = :isPublic';
        expressionAttributeValues[':isPublic'] = true;
      }

      if (options?.userId) {
        filterExpression += ' AND userId = :userId';
        expressionAttributeValues[':userId'] = options.userId;
      }

      const result = await this.dynamoService.scanItems<PatchCollection>(
        this.getTableConfig(),
        {
          filterExpression,
          expressionAttributeValues,
          limit: options?.limit,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to find collections containing patch ${patchId}:`, error);
      throw error;
    }
  }

  /**
   * Export collection as JSON
   */
  async exportCollection(collectionId: number): Promise<{
    collection: PatchCollection;
    exportData: any;
  }> {
    try {
      const collection = await this.findById(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }

      // Create export data with collection metadata
      const exportData = {
        collection: {
          name: collection.name,
          description: collection.description,
          tags: collection.tags,
          exportedAt: new Date().toISOString(),
        },
        patchIds: collection.patchIds,
        version: '1.0',
      };

      return {
        collection,
        exportData,
      };
    } catch (error) {
      this.logger.error(`Failed to export collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Import collection from export data
   */
  async importCollection(
    userId: string,
    importData: any,
    options?: {
      name?: string;
      isPublic?: boolean;
    }
  ): Promise<PatchCollection> {
    try {
      const collectionData = {
        name: options?.name || importData.collection?.name || 'Imported Collection',
        description: importData.collection?.description || 'Imported patch collection',
        userId,
        patchIds: importData.patchIds || [],
        isPublic: options?.isPublic || false,
        tags: importData.collection?.tags || ['imported'],
      };

      return this.createCollection(collectionData);
    } catch (error) {
      this.logger.error('Failed to import collection:', error);
      throw error;
    }
  }

  /**
   * Generate unique collection ID
   */
  private async generateCollectionId(): Promise<number> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`.slice(-10));
  }
}
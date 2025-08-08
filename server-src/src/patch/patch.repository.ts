import { Injectable } from '@nestjs/common';
import { BaseRepository, RepositoryConfig } from '../common/database/base-repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { Patch } from '../interfaces/patch.interface';

@Injectable()
export class PatchRepository extends BaseRepository<Patch> {
  protected readonly config: RepositoryConfig = {
    tableName: process.env.PATCHES_TABLE_NAME || 'PatchesTable-dev',
    primaryKey: 'id',
    indexes: {
      UserIndex: {
        partitionKey: 'username',
        sortKey: 'created_at',
      },
      CategoryIndex: {
        partitionKey: 'category',
        sortKey: 'created_at',
      },
      RatingIndex: {
        partitionKey: 'rating',
        sortKey: 'created_at',
      },
      CreatedAtIndex: {
        partitionKey: 'created_at',
      },
    },
  };

  constructor(dynamoService: DynamoDBService) {
    super(dynamoService);
  }

  /**
   * Create a new patch with auto-generated ID
   */
  async createPatch(patchData: Partial<Patch> & Pick<Patch, 'title' | 'description'>): Promise<Patch> {
    try {
      // Generate a unique ID (in production, you might want to use UUID or a more sophisticated approach)
      const id = await this.generatePatchId();
      
      // Create patch with defaults for all required fields
      const patch: Patch = {
        // Required fields
        title: patchData.title,
        description: patchData.description,
        
        // Synthesizer parameters with defaults
        sub_fifth: patchData.sub_fifth || 0,
        overtone: patchData.overtone || 0,
        ultra_saw: patchData.ultra_saw || 0,
        saw: patchData.saw || 0,
        pulse_width: patchData.pulse_width || 0.5,
        square: patchData.square || 0,
        metalizer: patchData.metalizer || 0,
        triangle: patchData.triangle || 0,
        cutoff: patchData.cutoff || 0.5,
        mode: patchData.mode || 0,
        resonance: patchData.resonance || 0,
        env_amt: patchData.env_amt || 0,
        brute_factor: patchData.brute_factor || 0,
        kbd_tracking: patchData.kbd_tracking || 0,
        modmatrix: patchData.modmatrix || [],
        octave: patchData.octave || 0,
        volume: patchData.volume || 0.8,
        glide: patchData.glide || 0,
        mod_wheel: patchData.mod_wheel || 0,
        amount: patchData.amount || 0,
        wave: patchData.wave || 0,
        rate: patchData.rate || 0.5,
        sync: patchData.sync || 0,
        env_amt_2: patchData.env_amt_2 || 0,
        vca: patchData.vca || 0,
        attack: patchData.attack || 0.1,
        decay: patchData.decay || 0.1,
        sustain: patchData.sustain || 0.8,
        release: patchData.release || 0.3,
        pattern: patchData.pattern || 0,
        play: patchData.play || 0,
        rate_2: patchData.rate_2 || 0.5,
        
        // System fields
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        average_rating: patchData.average_rating || '0',
        tags: patchData.tags || [],
        
        // Copy any additional properties
        ...patchData,
      };

      return this.create(patch);
    } catch (error) {
      this.logger.error('Failed to create patch:', error);
      throw error;
    }
  }

  /**
   * Find patch by ID
   */
  async findPatchById(id: number): Promise<Patch | null> {
    return this.findById(id);
  }

  /**
   * Update patch
   */
  async updatePatch(id: number, updates: Partial<Patch>): Promise<Patch | null> {
    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, ...allowedUpdates } = updates;

    return this.update(id, allowedUpdates);
  }

  /**
   * Get patches by user
   */
  async findPatchesByUser(
    username: string, 
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.queryByIndex(
        'UserIndex',
        'username = :username',
        { ':username': username },
        {
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
          scanIndexForward: options?.sortOrder !== 'desc',
        }
      );

      this.logger.debug(`Found ${result.count} patches for user ${username}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to find patches for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Get patches by category
   */
  async findPatchesByCategory(
    category: string,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.queryByIndex(
        'CategoryIndex',
        'category = :category',
        { ':category': category },
        {
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
          scanIndexForward: options?.sortOrder !== 'desc',
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to find patches by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get latest patches
   */
  async findLatestPatches(
    limit?: number,
    exclusiveStartKey?: any
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      // Use scan with sorting by created_at
      const result = await this.dynamoService.scanItems<Patch>(
        this.getTableConfig(),
        {
          limit,
          exclusiveStartKey,
          // Note: DynamoDB scan doesn't support sorting, so we'll need to sort client-side
          // In production, consider using a GSI with a static partition key for this
        }
      );

      // Sort by created_at descending (newest first)
      result.items.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to find latest patches:', error);
      throw error;
    }
  }

  /**
   * Get patches with high ratings
   */
  async findTopRatedPatches(
    minRating: number = 4,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
    }
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.dynamoService.scanItems<Patch>(
        this.getTableConfig(),
        {
          filterExpression: 'rating >= :minRating',
          expressionAttributeValues: { ':minRating': minRating },
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
        }
      );

      // Sort by rating descending
      result.items.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return result;
    } catch (error) {
      this.logger.error('Failed to find top rated patches:', error);
      throw error;
    }
  }

  /**
   * Search patches by text (title, description, tags)
   */
  async searchPatches(
    searchTerm: string,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
    }
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      const result = await this.dynamoService.scanItems<Patch>(
        this.getTableConfig(),
        {
          filterExpression: 'contains(#title, :searchTerm) OR contains(#description, :searchTerm) OR contains(#tags, :searchTerm)',
          expressionAttributeNames: {
            '#title': 'title',
            '#description': 'description',
            '#tags': 'tags',
          },
          expressionAttributeValues: {
            ':searchTerm': searchTermLower,
          },
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to search patches for term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Get patches by tag
   */
  async findPatchesByTag(
    tag: string,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
    }
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.dynamoService.scanItems<Patch>(
        this.getTableConfig(),
        {
          filterExpression: 'contains(tags, :tag)',
          expressionAttributeValues: { ':tag': tag },
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to find patches by tag "${tag}":`, error);
      throw error;
    }
  }

  /**
   * Update patch rating
   */
  async updatePatchRating(id: number, rating: number, averageRating: string): Promise<Patch | null> {
    try {
      const result = await this.update(id, {
        rating,
        average_rating: averageRating,
      });

      this.logger.log(`Updated rating for patch ${id} to ${rating} (avg: ${averageRating})`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update rating for patch ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get patch statistics
   */
  async getPatchStats(): Promise<{
    totalPatches: number;
    averageRating: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    try {
      // Get all patches for statistics (consider caching this in production)
      const result = await this.dynamoService.paginatedScan<Patch>({
        TableName: this.config.tableName,
        ProjectionExpression: 'id, category, rating',
      });

      const totalPatches = result.totalCount;
      const ratings = result.items
        .filter(p => p.rating && p.rating > 0)
        .map(p => p.rating!);
      
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

      // Count categories
      const categoryCount: Record<string, number> = {};
      result.items.forEach(patch => {
        if (patch.category) {
          categoryCount[patch.category] = (categoryCount[patch.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));

      return {
        totalPatches,
        averageRating: Math.round(averageRating * 100) / 100,
        topCategories,
      };
    } catch (error) {
      this.logger.error('Failed to get patch statistics:', error);
      throw error;
    }
  }

  /**
   * Batch get patches by IDs
   */
  async findPatchesByIds(patchIds: number[]): Promise<Patch[]> {
    if (patchIds.length === 0) {
      return [];
    }

    try {
      const batchGetParams = {
        RequestItems: {
          [this.config.tableName]: {
            Keys: patchIds.map(id => ({ id })),
          },
        },
      };

      const result = await this.dynamoService.batchGet(batchGetParams);
      return result[this.config.tableName] as Patch[] || [];
    } catch (error) {
      this.logger.error('Failed to batch get patches:', error);
      throw error;
    }
  }

  /**
   * Generate unique patch ID
   */
  private async generatePatchId(): Promise<number> {
    // Simple implementation - in production, consider using a more robust approach
    // like DynamoDB atomic counters or UUIDs
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`.slice(-10)); // Keep it to 10 digits
  }

  /**
   * Get user patch count
   */
  async getUserPatchCount(username: string): Promise<number> {
    try {
      const result = await this.queryByIndex(
        'UserIndex',
        'username = :username',
        { ':username': username },
        {
          // Only get the count, not the actual items
          projectionExpression: 'id',
        }
      );

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to get patch count for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Delete patches by user (for user cleanup)
   */
  async deletePatchesByUser(username: string): Promise<number> {
    try {
      // First get all patches by user
      const userPatches = await this.findPatchesByUser(username);
      
      if (userPatches.items.length === 0) {
        return 0;
      }

      // Prepare batch delete
      const deleteRequests = userPatches.items.map(patch => ({
        DeleteRequest: {
          Key: { id: patch.id },
        },
      }));

      // Execute batch delete (DynamoDB batch write supports max 25 items)
      const batchSize = 25;
      let deletedCount = 0;

      for (let i = 0; i < deleteRequests.length; i += batchSize) {
        const batch = deleteRequests.slice(i, i + batchSize);
        
        await this.dynamoService.batchWrite({
          RequestItems: {
            [this.config.tableName]: batch,
          },
        });

        deletedCount += batch.length;
      }

      this.logger.log(`Deleted ${deletedCount} patches for user ${username}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete patches for user ${username}:`, error);
      throw error;
    }
  }
}
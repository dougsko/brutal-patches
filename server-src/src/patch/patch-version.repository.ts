import { Injectable } from '@nestjs/common';
import {
  BaseRepository,
  RepositoryConfig,
} from '../common/database/base-repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { PatchVersion, PatchHistory } from '../interfaces/patch.interface';

@Injectable()
export class PatchVersionRepository extends BaseRepository<PatchVersion> {
  protected readonly config: RepositoryConfig = {
    tableName:
      process.env.PATCH_VERSIONS_TABLE_NAME || 'PatchVersionsTable-dev',
    primaryKey: 'id',
    sortKey: 'version',
    indexes: {
      PatchIndex: {
        partitionKey: 'patchId',
        sortKey: 'version',
      },
      UserIndex: {
        partitionKey: 'created_by',
        sortKey: 'created_at',
      },
    },
  };

  constructor(dynamoService: DynamoDBService) {
    super(dynamoService);
  }

  /**
   * Create a new patch version
   */
  async createVersion(
    versionData: Omit<PatchVersion, 'id'>,
  ): Promise<PatchVersion> {
    try {
      const id = await this.generateVersionId();
      const version: PatchVersion = {
        ...versionData,
        id,
        created_at: new Date().toISOString(),
      };

      return this.create(version);
    } catch (error) {
      this.logger.error('Failed to create patch version:', error);
      throw error;
    }
  }

  /**
   * Get patch history with all versions
   */
  async getPatchHistory(patchId: number): Promise<PatchHistory> {
    try {
      const result = await this.queryByIndex(
        'PatchIndex',
        'patchId = :patchId',
        { ':patchId': patchId },
        {
          scanIndexForward: false, // Get newest first
        },
      );

      return {
        patchId,
        versions: result.items,
        totalVersions: result.count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get patch history for patch ${patchId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get specific version of a patch
   */
  async getPatchVersion(
    patchId: number,
    version: number,
  ): Promise<PatchVersion | null> {
    try {
      // For composite key (patchId + version), we need to use query
      const result = await this.queryByIndex(
        'PatchIndex',
        'patchId = :patchId AND version = :version',
        {
          ':patchId': patchId,
          ':version': version,
        },
      );

      return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
      this.logger.error(
        `Failed to get patch version ${version} for patch ${patchId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get latest version number for a patch
   */
  async getLatestVersionNumber(patchId: number): Promise<number> {
    try {
      const result = await this.queryByIndex(
        'PatchIndex',
        'patchId = :patchId',
        { ':patchId': patchId },
        {
          scanIndexForward: false, // Get newest first
          limit: 1,
          projectionExpression: 'version',
        },
      );

      return result.items.length > 0 ? result.items[0].version : 0;
    } catch (error) {
      this.logger.error(
        `Failed to get latest version for patch ${patchId}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Get versions by user
   */
  async getVersionsByUser(
    username: string,
    options?: {
      limit?: number;
      exclusiveStartKey?: any;
    },
  ): Promise<{ items: PatchVersion[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const result = await this.queryByIndex(
        'UserIndex',
        'created_by = :username',
        { ':username': username },
        {
          limit: options?.limit,
          exclusiveStartKey: options?.exclusiveStartKey,
          scanIndexForward: false, // Newest first
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to get versions by user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Compare two patch versions
   */
  async compareVersions(
    patchId: number,
    version1: number,
    version2: number,
  ): Promise<{
    version1: PatchVersion | null;
    version2: PatchVersion | null;
    differences: Array<{
      field: string;
      value1: any;
      value2: any;
      type: 'added' | 'removed' | 'modified';
    }>;
  }> {
    try {
      const [v1, v2] = await Promise.all([
        this.getPatchVersion(patchId, version1),
        this.getPatchVersion(patchId, version2),
      ]);

      if (!v1 || !v2) {
        return {
          version1: v1,
          version2: v2,
          differences: [],
        };
      }

      const differences = this.calculateDifferences(v1.patchData, v2.patchData);

      return {
        version1: v1,
        version2: v2,
        differences,
      };
    } catch (error) {
      this.logger.error(
        `Failed to compare versions ${version1} and ${version2} for patch ${patchId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete all versions for a patch
   */
  async deleteVersionsForPatch(patchId: number): Promise<number> {
    try {
      const history = await this.getPatchHistory(patchId);

      if (history.versions.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const version of history.versions) {
        await this.delete(version.id, { sortKey: version.version });
        deletedCount++;
      }

      this.logger.log(`Deleted ${deletedCount} versions for patch ${patchId}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete versions for patch ${patchId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate differences between two patch data objects
   */
  private calculateDifferences(
    data1: any,
    data2: any,
  ): Array<{
    field: string;
    value1: any;
    value2: any;
    type: 'added' | 'removed' | 'modified';
  }> {
    const differences: Array<{
      field: string;
      value1: any;
      value2: any;
      type: 'added' | 'removed' | 'modified';
    }> = [];

    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(data1 || {}),
      ...Object.keys(data2 || {}),
    ]);

    for (const key of allKeys) {
      const value1 = data1?.[key];
      const value2 = data2?.[key];

      if (value1 === undefined && value2 !== undefined) {
        differences.push({
          field: key,
          value1: null,
          value2,
          type: 'added',
        });
      } else if (value1 !== undefined && value2 === undefined) {
        differences.push({
          field: key,
          value1,
          value2: null,
          type: 'removed',
        });
      } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field: key,
          value1,
          value2,
          type: 'modified',
        });
      }
    }

    return differences;
  }

  /**
   * Generate unique version ID
   */
  private async generateVersionId(): Promise<number> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`.slice(-10));
  }
}

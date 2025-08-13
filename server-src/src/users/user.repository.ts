import { Injectable } from '@nestjs/common';
import {
  BaseRepository,
  RepositoryConfig,
} from '../common/database/base-repository';
import { DynamoDBService } from '../common/database/dynamodb.service';
import { User } from '../interfaces/user.interface';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  protected readonly config: RepositoryConfig = {
    tableName: process.env.USERS_TABLE_NAME || 'UsersTable-dev',
    primaryKey: 'username',
    indexes: {
      EmailIndex: {
        partitionKey: 'email',
      },
    },
  };

  constructor(dynamoService: DynamoDBService) {
    super(dynamoService);
  }

  /**
   * Find user by username (primary key)
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findById(username);
  }

  /**
   * Find user by email using GSI
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.queryByIndex(
        'EmailIndex',
        'email = :email',
        { ':email': email },
        { limit: 1 },
      );

      return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
      this.logger.warn(
        'Email GSI query failed, falling back to scan:',
        error.message,
      );

      // Fallback to scan if GSI is not available
      try {
        const scanResult = await this.dynamoService.scanItems<User>(
          this.getTableConfig(),
          {
            filterExpression: 'email = :email',
            expressionAttributeValues: { ':email': email },
            limit: 1,
          },
        );

        return scanResult.items.length > 0 ? scanResult.items[0] : null;
      } catch (scanError) {
        this.logger.error(
          'Failed to find user by email (scan fallback):',
          scanError,
        );
        throw scanError;
      }
    }
  }

  /**
   * Create a new user
   */
  async createUser(user: User): Promise<User> {
    try {
      // Add timestamps
      const userWithTimestamps: User = {
        ...user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        patches: user.patches || [],
        roles: user.roles || ['user'],
      };

      return this.create(userWithTimestamps, {
        conditionExpression: 'attribute_not_exists(username)', // Prevent duplicate usernames
      });
    } catch (error) {
      if (error.message.includes('Conditional check failed')) {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(
    username: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    // Remove fields that shouldn't be updated directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      username: _unused_username,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _unused_createdAt,
      ...allowedUpdates
    } = updates;

    return this.update(username, allowedUpdates);
  }

  /**
   * Add patch to user's patch list
   */
  async addPatchToUser(
    username: string,
    patchId: number,
  ): Promise<User | null> {
    try {
      const tableConfig = this.getTableConfig();

      const result = await this.dynamoService.updateItem<User>(
        tableConfig,
        { username },
        'SET patches = list_append(if_not_exists(patches, :empty_list), :patch_id)',
        {
          expressionAttributeValues: {
            ':empty_list': [],
            ':patch_id': [patchId],
          },
          conditionExpression: 'attribute_exists(username)', // User must exist
        },
      );

      this.logger.log(`Added patch ${patchId} to user ${username}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to add patch ${patchId} to user ${username}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove patch from user's patch list
   */
  async removePatchFromUser(
    username: string,
    patchId: number,
  ): Promise<User | null> {
    try {
      // First get the user to find the patch index
      const user = await this.findByUsername(username);
      if (!user || !user.patches) {
        throw new Error('User not found or has no patches');
      }

      const patchIndex = user.patches.indexOf(patchId);
      if (patchIndex === -1) {
        throw new Error("Patch not found in user's patches");
      }

      // Remove the patch by index
      const tableConfig = this.getTableConfig();
      const result = await this.dynamoService.updateItem<User>(
        tableConfig,
        { username },
        `REMOVE patches[${patchIndex}]`,
        {
          conditionExpression: 'attribute_exists(username)',
        },
      );

      this.logger.log(`Removed patch ${patchId} from user ${username}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to remove patch ${patchId} from user ${username}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get users by role
   */
  async findByRole(role: string): Promise<User[]> {
    try {
      const result = await this.dynamoService.scanItems<User>(
        this.getTableConfig(),
        {
          filterExpression: 'contains(#roles, :role)',
          expressionAttributeNames: {
            '#roles': 'roles',
          },
          expressionAttributeValues: {
            ':role': role,
          },
        },
      );

      return result.items;
    } catch (error) {
      this.logger.error(`Failed to find users by role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(username: string): Promise<{
    totalPatches: number;
    createdAt: string;
    lastUpdated: string;
  } | null> {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        return null;
      }

      return {
        totalPatches: user.patches?.length || 0,
        createdAt: user.createdAt || '',
        lastUpdated: user.updatedAt || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Batch get users
   */
  async findUsersByUsernames(usernames: string[]): Promise<User[]> {
    if (usernames.length === 0) {
      return [];
    }

    try {
      const batchGetParams = {
        RequestItems: {
          [this.config.tableName]: {
            Keys: usernames.map((username) => ({ username })),
          },
        },
      };

      const result = await this.dynamoService.batchGet(batchGetParams);
      return (result[this.config.tableName] as User[]) || [];
    } catch (error) {
      this.logger.error('Failed to batch get users:', error);
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const user = await this.findByUsername(username);
      return user === null;
    } catch (error) {
      this.logger.error(
        `Failed to check username availability for ${username}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      return user === null;
    } catch (error) {
      this.logger.error(
        `Failed to check email availability for ${email}:`,
        error,
      );
      return false;
    }
  }
}

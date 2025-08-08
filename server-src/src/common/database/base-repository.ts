import { Logger } from '@nestjs/common';
import {
  DynamoDBService,
  TableConfig,
  QueryOptions,
  ScanOptions,
} from './dynamodb.service';

export interface RepositoryConfig {
  tableName: string;
  primaryKey: string;
  sortKey?: string;
  indexes?: {
    [indexName: string]: {
      partitionKey: string;
      sortKey?: string;
    };
  };
}

export interface CreateOptions {
  overwrite?: boolean;
  conditionExpression?: string;
}

export interface UpdateOptions {
  conditionExpression?: string;
  returnUpdatedItem?: boolean;
}

export interface DeleteOptions {
  conditionExpression?: string;
  returnDeletedItem?: boolean;
}

export interface ListOptions {
  limit?: number;
  exclusiveStartKey?: any;
  indexName?: string;
  filterExpression?: string;
  sortOrder?: 'asc' | 'desc';
}

export abstract class BaseRepository<T> {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly config: RepositoryConfig;

  constructor(protected readonly dynamoService: DynamoDBService) {}

  /**
   * Get table configuration
   */
  protected getTableConfig(): TableConfig {
    return {
      tableName: this.config.tableName,
      primaryKey: this.config.primaryKey,
      sortKey: this.config.sortKey,
      indexes: this.config.indexes,
    };
  }

  /**
   * Create a new item
   */
  async create(item: T, options?: CreateOptions): Promise<T> {
    try {
      const tableConfig = this.getTableConfig();
      const putOptions: any = {};

      if (!options?.overwrite) {
        // Prevent overwriting existing items by default
        putOptions.conditionExpression = `attribute_not_exists(${tableConfig.primaryKey})`;
      }

      if (options?.conditionExpression) {
        putOptions.conditionExpression = options.conditionExpression;
      }

      await this.dynamoService.putItem(tableConfig, item, putOptions);

      this.logger.log(`Created item with key: ${this.getItemKey(item)}`);
      return item;
    } catch (error) {
      this.logger.error('Failed to create item:', error);
      throw error;
    }
  }

  /**
   * Get item by primary key
   */
  async findById(id: any, sortKey?: any): Promise<T | null> {
    try {
      const tableConfig = this.getTableConfig();
      const key: Record<string, any> = { [tableConfig.primaryKey]: id };

      if (tableConfig.sortKey && sortKey !== undefined) {
        key[tableConfig.sortKey] = sortKey;
      }

      const item = await this.dynamoService.getItem<T>(tableConfig, key);

      if (item) {
        this.logger.debug(`Found item with key: ${JSON.stringify(key)}`);
      }

      return item;
    } catch (error) {
      this.logger.error(`Failed to find item by id: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update item
   */
  async update(
    id: any,
    updates: Partial<T>,
    options?: UpdateOptions & { sortKey?: any },
  ): Promise<T | null> {
    try {
      const tableConfig = this.getTableConfig();
      const key: Record<string, any> = { [tableConfig.primaryKey]: id };

      if (tableConfig.sortKey && options?.sortKey !== undefined) {
        key[tableConfig.sortKey] = options.sortKey;
      }

      // Build update expression
      const {
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      } = this.buildUpdateExpression(updates);

      const updateOptions = {
        conditionExpression: options?.conditionExpression,
        expressionAttributeNames,
        expressionAttributeValues,
        returnValues: (options?.returnUpdatedItem !== false
          ? 'ALL_NEW'
          : 'NONE') as any,
      };

      const result = await this.dynamoService.updateItem<T>(
        tableConfig,
        key,
        updateExpression,
        updateOptions,
      );

      this.logger.log(`Updated item with key: ${JSON.stringify(key)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update item with id: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete item
   */
  async delete(
    id: any,
    options?: DeleteOptions & { sortKey?: any },
  ): Promise<T | null> {
    try {
      const tableConfig = this.getTableConfig();
      const key: Record<string, any> = { [tableConfig.primaryKey]: id };

      if (tableConfig.sortKey && options?.sortKey !== undefined) {
        key[tableConfig.sortKey] = options.sortKey;
      }

      const deleteOptions = {
        conditionExpression: options?.conditionExpression,
        returnValues: (options?.returnDeletedItem ? 'ALL_OLD' : 'NONE') as any,
      };

      const result = await this.dynamoService.deleteItem(
        tableConfig,
        key,
        deleteOptions,
      );

      this.logger.log(`Deleted item with key: ${JSON.stringify(key)}`);
      return result as T | null;
    } catch (error) {
      this.logger.error(`Failed to delete item with id: ${id}`, error);
      throw error;
    }
  }

  /**
   * List items with pagination
   */
  async list(
    options?: ListOptions,
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const tableConfig = this.getTableConfig();

      const scanOptions: ScanOptions & {
        filterExpression?: string;
        expressionAttributeNames?: Record<string, string>;
        expressionAttributeValues?: Record<string, any>;
      } = {
        limit: options?.limit,
        exclusiveStartKey: options?.exclusiveStartKey,
        indexName: options?.indexName,
        filterExpression: options?.filterExpression,
      };

      const result = await this.dynamoService.scanItems<T>(
        tableConfig,
        scanOptions,
      );

      this.logger.debug(
        `Listed ${result.count} items from table ${tableConfig.tableName}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to list items:', error);
      throw error;
    }
  }

  /**
   * Query items by index
   */
  async queryByIndex(
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: QueryOptions & {
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
    },
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const tableConfig = this.getTableConfig();

      const queryOptions = {
        ...options,
        indexName,
        filterExpression: options?.filterExpression,
        expressionAttributeNames: options?.expressionAttributeNames,
      };

      const result = await this.dynamoService.queryItems<T>(
        tableConfig,
        keyConditionExpression,
        expressionAttributeValues,
        queryOptions,
      );

      this.logger.debug(
        `Queried ${result.count} items from index ${indexName}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to query index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Check if item exists
   */
  async exists(id: any, sortKey?: any): Promise<boolean> {
    try {
      const item = await this.findById(id, sortKey);
      return item !== null;
    } catch (error) {
      this.logger.error(`Failed to check if item exists with id: ${id}`, error);
      return false;
    }
  }

  /**
   * Count items
   */
  async count(filterExpression?: string): Promise<number> {
    try {
      const tableConfig = this.getTableConfig();

      const scanOptions = {
        filterExpression,
        // Only get the count, not the items
        projectionExpression: tableConfig.primaryKey,
      };

      let totalCount = 0;
      let lastEvaluatedKey = undefined;

      do {
        const result = await this.dynamoService.scanItems<T>(tableConfig, {
          ...scanOptions,
          exclusiveStartKey: lastEvaluatedKey,
        });

        totalCount += result.count;
        lastEvaluatedKey = result.lastEvaluatedKey;
      } while (lastEvaluatedKey);

      return totalCount;
    } catch (error) {
      this.logger.error('Failed to count items:', error);
      throw error;
    }
  }

  /**
   * Build update expression from partial object
   */
  protected buildUpdateExpression(updates: Partial<T>): {
    updateExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  } {
    const setExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined) {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;

        setExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    // Add updatedAt timestamp
    const updatedAtKey = `#updatedAt`;
    const updatedAtValue = `:updatedAt`;
    setExpressions.push(`${updatedAtKey} = ${updatedAtValue}`);
    expressionAttributeNames[updatedAtKey] = 'updatedAt';
    expressionAttributeValues[updatedAtValue] = new Date().toISOString();

    return {
      updateExpression: `SET ${setExpressions.join(', ')}`,
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  /**
   * Extract key from item (for logging)
   */
  protected getItemKey(item: T): string {
    const tableConfig = this.getTableConfig();
    const primaryKeyValue = (item as any)[tableConfig.primaryKey];
    const sortKeyValue = tableConfig.sortKey
      ? (item as any)[tableConfig.sortKey]
      : null;

    return sortKeyValue
      ? `${primaryKeyValue}#${sortKeyValue}`
      : `${primaryKeyValue}`;
  }
}

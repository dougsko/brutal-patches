import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  ScanCommandInput,
  QueryCommandInput,
  BatchGetCommandInput,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

export interface DynamoDBConfig {
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface TableConfig {
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

export interface PaginationOptions {
  limit?: number;
  exclusiveStartKey?: any;
}

export interface QueryOptions extends PaginationOptions {
  indexName?: string;
  scanIndexForward?: boolean;
  consistentRead?: boolean;
  projectionExpression?: string;
}

export interface ScanOptions extends PaginationOptions {
  indexName?: string;
  consistentRead?: boolean;
  totalSegments?: number;
  segment?: number;
}

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private readonly logger = new Logger(DynamoDBService.name);
  private dynamoClient: DynamoDBDocumentClient;
  private config: DynamoDBConfig;

  constructor() {
    this.config = {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = new DynamoDBClient(this.config);
      this.dynamoClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertEmptyValues: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });

      this.logger.log('DynamoDB service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DynamoDB service:', error);
      throw error;
    }
  }

  /**
   * Get a single item by primary key
   */
  async get<T = any>(params: GetCommandInput): Promise<T | null> {
    try {
      const command = new GetCommand(params);
      const result = await this.dynamoClient.send(command);
      return result.Item as T | null;
    } catch (error) {
      this.logger.error('DynamoDB Get operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Get a single item by primary key with table configuration
   */
  async getItem<T = any>(
    tableConfig: TableConfig,
    key: Record<string, any>,
    options?: { consistentRead?: boolean; projectionExpression?: string },
  ): Promise<T | null> {
    const params: GetCommandInput = {
      TableName: tableConfig.tableName,
      Key: key,
      ConsistentRead: options?.consistentRead,
      ProjectionExpression: options?.projectionExpression,
    };

    return this.get<T>(params);
  }

  /**
   * Put (create or replace) an item
   */
  async put<T = any>(params: PutCommandInput): Promise<void> {
    try {
      const command = new PutCommand(params);
      await this.dynamoClient.send(command);
    } catch (error) {
      this.logger.error('DynamoDB Put operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Put an item with table configuration
   */
  async putItem<T = any>(
    tableConfig: TableConfig,
    item: T,
    options?: {
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
    },
  ): Promise<void> {
    const params: PutCommandInput = {
      TableName: tableConfig.tableName,
      Item: item,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
    };

    return this.put(params);
  }

  /**
   * Update an item
   */
  async update<T = any>(params: UpdateCommandInput): Promise<T | null> {
    try {
      const command = new UpdateCommand(params);
      const result = await this.dynamoClient.send(command);
      return result.Attributes as T | null;
    } catch (error) {
      this.logger.error('DynamoDB Update operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Update an item with table configuration
   */
  async updateItem<T = any>(
    tableConfig: TableConfig,
    key: Record<string, any>,
    updateExpression: string,
    options?: {
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
      returnValues?:
        | 'NONE'
        | 'ALL_OLD'
        | 'UPDATED_OLD'
        | 'ALL_NEW'
        | 'UPDATED_NEW';
    },
  ): Promise<T | null> {
    const params: UpdateCommandInput = {
      TableName: tableConfig.tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues || 'ALL_NEW',
    };

    return this.update<T>(params);
  }

  /**
   * Delete an item
   */
  async delete(params: DeleteCommandInput): Promise<any> {
    try {
      const command = new DeleteCommand(params);
      const result = await this.dynamoClient.send(command);
      return result.Attributes;
    } catch (error) {
      this.logger.error('DynamoDB Delete operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Delete an item with table configuration
   */
  async deleteItem(
    tableConfig: TableConfig,
    key: Record<string, any>,
    options?: {
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
      returnValues?: 'NONE' | 'ALL_OLD';
    },
  ): Promise<any> {
    const params: DeleteCommandInput = {
      TableName: tableConfig.tableName,
      Key: key,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues,
    };

    return this.delete(params);
  }

  /**
   * Query items
   */
  async query<T = any>(
    params: QueryCommandInput,
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const command = new QueryCommand(params);
      const result = await this.dynamoClient.send(command);
      return {
        items: (result.Items as T[]) || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
      };
    } catch (error) {
      this.logger.error('DynamoDB Query operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Query items with table configuration
   */
  async queryItems<T = any>(
    tableConfig: TableConfig,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: QueryOptions & {
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
    },
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    const params: QueryCommandInput = {
      TableName: tableConfig.tableName,
      IndexName: options?.indexName,
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: options?.filterExpression,
      ProjectionExpression: options?.projectionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options?.limit,
      ExclusiveStartKey: options?.exclusiveStartKey,
      ScanIndexForward: options?.scanIndexForward,
      ConsistentRead: options?.consistentRead,
    };

    return this.query<T>(params);
  }

  /**
   * Scan items
   */
  async scan<T = any>(
    params: ScanCommandInput,
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    try {
      const command = new ScanCommand(params);
      const result = await this.dynamoClient.send(command);
      return {
        items: (result.Items as T[]) || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
      };
    } catch (error) {
      this.logger.error('DynamoDB Scan operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Scan items with table configuration
   */
  async scanItems<T = any>(
    tableConfig: TableConfig,
    options?: ScanOptions & {
      filterExpression?: string;
      projectionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
    },
  ): Promise<{ items: T[]; lastEvaluatedKey?: any; count: number }> {
    const params: ScanCommandInput = {
      TableName: tableConfig.tableName,
      IndexName: options?.indexName,
      FilterExpression: options?.filterExpression,
      ProjectionExpression: options?.projectionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      Limit: options?.limit,
      ExclusiveStartKey: options?.exclusiveStartKey,
      ConsistentRead: options?.consistentRead,
      TotalSegments: options?.totalSegments,
      Segment: options?.segment,
    };

    return this.scan<T>(params);
  }

  /**
   * Batch get items
   */
  async batchGet<T = any>(
    params: BatchGetCommandInput,
  ): Promise<Record<string, T[]>> {
    try {
      const command = new BatchGetCommand(params);
      const result = await this.dynamoClient.send(command);
      return (result.Responses as Record<string, T[]>) || {};
    } catch (error) {
      this.logger.error('DynamoDB BatchGet operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Batch write items (put/delete)
   */
  async batchWrite(params: BatchWriteCommandInput): Promise<any> {
    try {
      const command = new BatchWriteCommand(params);
      const result = await this.dynamoClient.send(command);
      return result.UnprocessedItems;
    } catch (error) {
      this.logger.error('DynamoDB BatchWrite operation failed:', error);
      throw this.handleDynamoDBError(error);
    }
  }

  /**
   * Paginated query - automatically handles pagination
   */
  async paginatedQuery<T = any>(
    params: QueryCommandInput,
    maxItems?: number,
  ): Promise<{ items: T[]; totalCount: number }> {
    const allItems: T[] = [];
    let lastEvaluatedKey = undefined;
    let totalCount = 0;

    do {
      const queryParams = {
        ...params,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await this.query<T>(queryParams);
      allItems.push(...result.items);
      totalCount += result.count;
      lastEvaluatedKey = result.lastEvaluatedKey;

      if (maxItems && allItems.length >= maxItems) {
        break;
      }
    } while (lastEvaluatedKey);

    return {
      items: maxItems ? allItems.slice(0, maxItems) : allItems,
      totalCount,
    };
  }

  /**
   * Paginated scan - automatically handles pagination
   */
  async paginatedScan<T = any>(
    params: ScanCommandInput,
    maxItems?: number,
  ): Promise<{ items: T[]; totalCount: number }> {
    const allItems: T[] = [];
    let lastEvaluatedKey = undefined;
    let totalCount = 0;

    do {
      const scanParams = {
        ...params,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await this.scan<T>(scanParams);
      allItems.push(...result.items);
      totalCount += result.count;
      lastEvaluatedKey = result.lastEvaluatedKey;

      if (maxItems && allItems.length >= maxItems) {
        break;
      }
    } while (lastEvaluatedKey);

    return {
      items: maxItems ? allItems.slice(0, maxItems) : allItems,
      totalCount,
    };
  }

  /**
   * Transaction write - for complex operations
   */
  async transactionWrite(items: any[]): Promise<void> {
    // Implementation would go here for transactional writes
    // This is a placeholder for future enhancement
    throw new Error('Transaction write not implemented yet');
  }

  /**
   * Handle DynamoDB specific errors
   */
  private handleDynamoDBError(error: any): Error {
    const errorCode = error.name || error.$metadata?.httpStatusCode;

    switch (errorCode) {
      case 'ConditionalCheckFailedException':
        return new Error(
          'Conditional check failed - item may already exist or condition not met',
        );
      case 'ResourceNotFoundException':
        return new Error('Table or resource not found');
      case 'ValidationException':
        return new Error(`Validation error: ${error.message}`);
      case 'ProvisionedThroughputExceededException':
        return new Error(
          'Request rate too high - retry with exponential backoff',
        );
      case 'ItemCollectionSizeLimitExceededException':
        return new Error('Item collection size limit exceeded');
      case 'RequestLimitExceeded':
        return new Error(
          'Request limit exceeded - retry with exponential backoff',
        );
      case 'InternalServerError':
        return new Error('DynamoDB internal server error - retry operation');
      default:
        return new Error(`DynamoDB operation failed: ${error.message}`);
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check by attempting to describe any table
      const command = new ScanCommand({
        TableName: 'NonExistentTable',
        Limit: 1,
      });

      await this.dynamoClient.send(command);
      return true;
    } catch (error) {
      // ResourceNotFoundException is expected and means DynamoDB is reachable
      if (error.name === 'ResourceNotFoundException') {
        return true;
      }
      this.logger.warn('DynamoDB health check failed:', error.message);
      return false;
    }
  }
}

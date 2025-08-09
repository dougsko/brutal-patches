#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { PATCHES } from '../src/mock-patches';

async function seedAllPatches() {
  console.log('🌱 Starting complete patch seeding...');
  
  const client = new DynamoDBClient({ region: 'us-east-1' });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const tableName = 'PatchesTable-prod';
  
  console.log(`📊 Seeding ${PATCHES.length} patches...`);
  
  // Process in batches of 25 (DynamoDB limit)
  const BATCH_SIZE = 25;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < PATCHES.length; i += BATCH_SIZE) {
    const batch = PATCHES.slice(i, i + BATCH_SIZE);
    console.log(`📝 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(PATCHES.length / BATCH_SIZE)}`);
    
    try {
      const putRequests = batch.map(patch => ({
        PutRequest: {
          Item: {
            ...patch,
            // Fix empty strings that cause DynamoDB index issues
            average_rating: patch.average_rating && patch.average_rating.trim() !== '' ? patch.average_rating : '0',
            username: 'legacy-user',
            category: 'imported',
            tags: patch.tags || [],
            modmatrix: patch.modmatrix || [],
          }
        }
      }));
      
      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests
        }
      });
      
      await docClient.send(command);
      console.log(`  ✅ Batch completed: ${batch.length} patches`);
      successCount += batch.length;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`  ❌ Batch failed:`, error.message);
      errorCount += batch.length;
    }
  }
  
  console.log(`\n🎉 Seeding complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${successCount + errorCount}/${PATCHES.length}`);
}

seedAllPatches().catch(console.error);
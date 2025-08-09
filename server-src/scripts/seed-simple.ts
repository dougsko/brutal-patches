#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PATCHES } from '../src/mock-patches';

async function seedPatchesSimple() {
  console.log('🌱 Starting simple patch seeding...');
  
  const client = new DynamoDBClient({ region: 'us-east-1' });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const tableName = 'PatchesTable-prod';
  
  // Take first 10 patches for testing
  const testPatches = PATCHES.slice(0, 10);
  
  console.log(`📊 Seeding ${testPatches.length} test patches...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const patch of testPatches) {
    try {
      const item = {
        ...patch,
        // Fix empty strings that cause DynamoDB index issues
        average_rating: patch.average_rating || '0',
        username: 'legacy-user',
        category: 'imported',
        // Ensure all required fields are present
        tags: patch.tags || [],
        modmatrix: patch.modmatrix || [],
      };
      
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });
      
      await docClient.send(command);
      console.log(`  ✅ Created patch ${patch.id}: "${patch.title}"`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Failed to create patch ${patch.id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n🎉 Seeding complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

seedPatchesSimple().catch(console.error);
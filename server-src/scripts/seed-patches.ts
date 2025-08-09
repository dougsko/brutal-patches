#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PatchRepository } from '../src/patch/patch.repository';
import { PATCHES } from '../src/mock-patches';
import { Patch } from '../src/interfaces/patch.interface';

async function seedPatches() {
  console.log('🌱 Starting patch seeding process...');
  
  // Set environment variables for production tables
  process.env.PATCHES_TABLE_NAME = 'PatchesTable-prod';
  process.env.USERS_TABLE_NAME = 'UsersTableV2-prod';
  process.env.JWT_SECRET = 'dev-secret-for-seeding';  // Only needed for initialization
  
  try {
    // Create the NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    const patchRepository = app.get(PatchRepository);

    console.log(`📊 Found ${PATCHES.length} patches to seed`);

    // Process patches in batches to avoid overwhelming DynamoDB
    const BATCH_SIZE = 25; // DynamoDB BatchWriteItem limit
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < PATCHES.length; i += BATCH_SIZE) {
      const batch = PATCHES.slice(i, i + BATCH_SIZE);
      console.log(`📝 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(PATCHES.length / BATCH_SIZE)} (${batch.length} patches)`);

      for (const mockPatch of batch) {
        try {
          // Transform mock patch data for database
          const patchData: Partial<Patch> & Pick<Patch, 'title' | 'description'> = {
            // Use the existing ID from mock data
            id: mockPatch.id,
            title: mockPatch.title,
            description: mockPatch.description,
            
            // Copy all synthesizer parameters
            sub_fifth: mockPatch.sub_fifth,
            overtone: mockPatch.overtone,
            ultra_saw: mockPatch.ultra_saw,
            saw: mockPatch.saw,
            pulse_width: mockPatch.pulse_width,
            square: mockPatch.square,
            metalizer: mockPatch.metalizer,
            triangle: mockPatch.triangle,
            cutoff: mockPatch.cutoff,
            mode: mockPatch.mode,
            resonance: mockPatch.resonance,
            env_amt: mockPatch.env_amt,
            brute_factor: mockPatch.brute_factor,
            kbd_tracking: mockPatch.kbd_tracking,
            modmatrix: mockPatch.modmatrix || [],
            octave: mockPatch.octave,
            volume: mockPatch.volume,
            glide: mockPatch.glide,
            mod_wheel: mockPatch.mod_wheel,
            amount: mockPatch.amount,
            wave: mockPatch.wave,
            rate: mockPatch.rate,
            sync: mockPatch.sync,
            env_amt_2: mockPatch.env_amt_2,
            vca: mockPatch.vca,
            attack: mockPatch.attack,
            decay: mockPatch.decay,
            sustain: mockPatch.sustain,
            release: mockPatch.release,
            pattern: mockPatch.pattern,
            play: mockPatch.play,
            rate_2: mockPatch.rate_2,
            
            // Metadata
            created_at: mockPatch.created_at,
            updated_at: mockPatch.updated_at,
            average_rating: mockPatch.average_rating || '0', // Fix empty strings for DynamoDB index
            tags: mockPatch.tags || [],
            
            // Add default username for legacy patches
            username: 'legacy-user',
            category: 'imported',
          };

          // Use direct create method to preserve the ID
          const createdPatch = await patchRepository.create(patchData as Patch);
          console.log(`  ✅ Created patch ${createdPatch.id}: "${createdPatch.title}"`);
          successCount++;
          
        } catch (error) {
          console.error(`  ❌ Failed to create patch ${mockPatch.id}: "${mockPatch.title}"`, error.message);
          errorCount++;
        }
      }

      // Small delay between batches to be kind to DynamoDB
      if (i + BATCH_SIZE < PATCHES.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n🎉 Seeding complete!');
    console.log(`✅ Successfully created: ${successCount} patches`);
    console.log(`❌ Failed to create: ${errorCount} patches`);
    console.log(`📊 Total processed: ${successCount + errorCount}/${PATCHES.length}`);

    await app.close();
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  seedPatches().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { seedPatches };
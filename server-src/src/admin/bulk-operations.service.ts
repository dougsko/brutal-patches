import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PatchService } from '../patch/patch.service';
import { PatchRepository } from '../patch/patch.repository';
import { PatchCollectionRepository } from '../patch/patch-collection.repository';
import { Patch, PatchCollection } from '../interfaces/patch.interface';

export interface BulkExportOptions {
  format: 'json' | 'csv';
  includeMetadata?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface BulkImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    item: any;
    error: string;
  }>;
}

@Injectable()
export class BulkOperationsService {
  constructor(
    private patchService: PatchService,
    private patchRepository: PatchRepository,
    private collectionRepository: PatchCollectionRepository,
  ) {}

  /**
   * Bulk export patches
   */
  async exportPatches(
    patchIds: number[],
    options: BulkExportOptions = { format: 'json' },
  ): Promise<{
    filename: string;
    data: any;
    contentType: string;
  }> {
    try {
      const patches = await Promise.all(
        patchIds.map((id) => this.patchRepository.findPatchById(id)),
      );

      const validPatches = patches.filter((p) => p !== null) as Patch[];

      if (validPatches.length === 0) {
        throw new HttpException('No valid patches found', HttpStatus.NOT_FOUND);
      }

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalPatches: validPatches.length,
        patches: validPatches.map((patch) => {
          if (options.includeMetadata) {
            return patch;
          } else {
            // Remove system metadata for cleaner export
            const {
              created_at: _created_at,
              updated_at: _updated_at,
              average_rating: _average_rating,
              ...cleanPatch
            } = patch;
            return cleanPatch;
          }
        }),
      };

      const filename = `patches_export_${Date.now()}.${options.format}`;
      const contentType =
        options.format === 'json' ? 'application/json' : 'text/csv';

      return {
        filename,
        data:
          options.format === 'json'
            ? exportData
            : this.convertToCSV(validPatches),
        contentType,
      };
    } catch (error: any) {
      throw new HttpException(
        `Export failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk import patches
   */
  async importPatches(
    username: string,
    importData: any,
    options?: {
      overwrite?: boolean;
      validateOnly?: boolean;
    },
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    try {
      const patches = Array.isArray(importData)
        ? importData
        : importData.patches || [];

      if (!Array.isArray(patches)) {
        throw new HttpException(
          'Invalid import data format',
          HttpStatus.BAD_REQUEST,
        );
      }

      for (const patchData of patches) {
        try {
          // Validate patch data
          if (!this.validatePatchData(patchData)) {
            throw new Error('Invalid patch data structure');
          }

          if (options?.validateOnly) {
            result.successful++;
            continue;
          }

          // Create or update patch
          await this.patchService.createPatch(username, patchData);
          result.successful++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            item: patchData,
            error: error.message,
          });
        }
      }

      return result;
    } catch (error: any) {
      throw new HttpException(
        `Import failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk delete patches
   */
  async deletePatches(patchIds: number[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const patchId of patchIds) {
      try {
        await this.patchRepository.delete(patchId);
        result.successful++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(
          `Failed to delete patch ${patchId}: ${error.message}`,
        );
      }
    }

    return result;
  }

  /**
   * Bulk update patch categories
   */
  async updatePatchCategories(
    patchIds: number[],
    category: string,
  ): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const patchId of patchIds) {
      try {
        await this.patchRepository.updatePatch(patchId, { category } as any);
        result.successful++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(
          `Failed to update patch ${patchId}: ${error.message}`,
        );
      }
    }

    return result;
  }

  /**
   * Export collections
   */
  async exportCollections(
    collectionIds: number[],
    options: BulkExportOptions = { format: 'json' },
  ): Promise<{
    filename: string;
    data: any;
    contentType: string;
  }> {
    try {
      const collections = await Promise.all(
        collectionIds.map((id) => this.collectionRepository.findById(id)),
      );

      const validCollections = collections.filter(
        (c) => c !== null,
      ) as PatchCollection[];

      if (validCollections.length === 0) {
        throw new HttpException(
          'No valid collections found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Get patch data for each collection
      const collectionsWithPatches = await Promise.all(
        validCollections.map(async (collection) => {
          const patches = await Promise.all(
            collection.patchIds.map((id) =>
              this.patchRepository.findPatchById(id),
            ),
          );

          return {
            ...collection,
            patches: patches.filter((p) => p !== null),
          };
        }),
      );

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalCollections: collectionsWithPatches.length,
        collections: collectionsWithPatches,
      };

      const filename = `collections_export_${Date.now()}.${options.format}`;
      const contentType =
        options.format === 'json' ? 'application/json' : 'text/csv';

      return {
        filename,
        data:
          options.format === 'json'
            ? exportData
            : this.convertToCSV(collectionsWithPatches),
        contentType,
      };
    } catch (error: any) {
      throw new HttpException(
        `Collection export failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Import collections
   */
  async importCollections(
    username: string,
    importData: any,
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    try {
      const collections = Array.isArray(importData)
        ? importData
        : importData.collections || [];

      for (const collectionData of collections) {
        try {
          // Import patches first if included
          const patchIds: number[] = [];
          if (collectionData.patches) {
            for (const patch of collectionData.patches) {
              try {
                const createdPatch = await this.patchService.createPatch(
                  username,
                  patch,
                );
                patchIds.push(createdPatch.id);
              } catch (error: any) {
                // Log patch import error but continue with collection
                console.warn(
                  `Failed to import patch in collection: ${error.message}`,
                );
              }
            }
          } else {
            patchIds.push(...(collectionData.patchIds || []));
          }

          // Create collection
          const _newCollection = await this.patchService.createCollection(
            username,
            {
              name: collectionData.name,
              description: collectionData.description,
              patchIds,
              isPublic: collectionData.isPublic || false,
              tags: collectionData.tags || [],
            },
          );

          result.successful++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            item: collectionData,
            error: error.message,
          });
        }
      }

      return result;
    } catch (error: any) {
      throw new HttpException(
        `Collection import failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate random patches for testing
   */
  async generateRandomPatches(
    username: string,
    count: number,
    options?: {
      categories?: string[];
      includeModMatrix?: boolean;
    },
  ): Promise<Patch[]> {
    const generatedPatches: Patch[] = [];
    const categories = options?.categories || [
      'bass',
      'lead',
      'pad',
      'arp',
      'pluck',
    ];

    for (let i = 0; i < count; i++) {
      try {
        const randomPatch = this.generateRandomPatch(categories);
        const createdPatch = await this.patchService.createPatch(
          username,
          randomPatch,
        );
        generatedPatches.push(createdPatch);
      } catch (error: any) {
        console.warn(
          `Failed to generate random patch ${i + 1}: ${error.message}`,
        );
      }
    }

    return generatedPatches;
  }

  /**
   * Private helper methods
   */
  private validatePatchData(patchData: any): boolean {
    // Basic validation for required fields
    return (
      patchData &&
      typeof patchData.title === 'string' &&
      typeof patchData.description === 'string' &&
      typeof patchData.cutoff === 'number' &&
      typeof patchData.resonance === 'number'
      // Add more validation as needed
    );
  }

  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle arrays and objects
            if (Array.isArray(value)) {
              return `"${value.join(';')}"`;
            }
            if (typeof value === 'object' && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Escape CSV values that contain commas or quotes
            if (
              typeof value === 'string' &&
              (value.includes(',') || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  private generateRandomPatch(categories: string[]): any {
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    return {
      title: `Random ${
        randomCategory.charAt(0).toUpperCase() + randomCategory.slice(1)
      } ${Date.now()}`,
      description: `Randomly generated ${randomCategory} patch`,
      category: randomCategory,

      // Oscillator parameters
      sub_fifth: Math.random(),
      overtone: Math.random(),
      ultra_saw: Math.random(),
      saw: Math.random(),
      pulse_width: Math.random(),
      square: Math.random(),
      metalizer: Math.random(),
      triangle: Math.random(),

      // Filter parameters
      cutoff: Math.random(),
      mode: Math.floor(Math.random() * 3),
      resonance: Math.random(),
      env_amt: Math.random() - 0.5,
      brute_factor: Math.random(),
      kbd_tracking: Math.random() - 0.5,

      // Other parameters
      octave: Math.floor(Math.random() * 5) + 1,
      volume: 0.5 + Math.random() * 0.5,
      glide: Math.random(),
      mod_wheel: Math.random(),
      amount: Math.random(),
      wave: Math.floor(Math.random() * 3),
      rate: Math.random(),
      sync: Math.floor(Math.random() * 2),
      env_amt_2: Math.random() - 0.5,
      vca: Math.floor(Math.random() * 2),

      // Envelope
      attack: Math.random(),
      decay: Math.random(),
      sustain: Math.random(),
      release: Math.random(),

      // Sequencer
      pattern: Math.floor(Math.random() * 8),
      play: Math.floor(Math.random() * 3),
      rate_2: Math.random(),

      // Modulation matrix (simplified)
      modmatrix: [],

      // Tags
      tags: [randomCategory, 'generated', 'random'],
    };
  }
}

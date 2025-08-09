import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Patch,
  PatchVersion,
  PatchHistory,
  PatchCollection,
  PatchSearchFilters,
  PatchComparison,
  PatchCategory,
} from '../interfaces/patch.interface';
import { User } from '../interfaces/user.interface';
import { PATCHES } from '../mock-patches';
import { UsersService } from '../users/users.service';
import { PatchRepository } from './patch.repository';
import { PatchVersionRepository } from './patch-version.repository';
import { PatchCollectionRepository } from './patch-collection.repository';

@Injectable()
export class PatchService {
  constructor(
    private userService: UsersService,
    private patchRepository: PatchRepository,
    private versionRepository: PatchVersionRepository,
    private collectionRepository: PatchCollectionRepository,
  ) {}

  patches: Patch[] = PATCHES; // Keep for backward compatibility during migration

  public async getAllPatches(): Promise<any> {
    try {
      // Try to get from database first
      const result = await this.patchRepository.list();
      const dbPatches = result.items;
      if (dbPatches && dbPatches.length > 0) {
        return dbPatches;
      }
      // Fallback to mock data if database is empty
      return this.patches;
    } catch (error) {
      console.warn('Failed to get patches from database, using mock data:', error);
      return this.patches;
    }
  }

  public async getPatch(id: string): Promise<Patch> {
    try {
      // Try to get from database first
      const dbPatch = await this.patchRepository.findPatchById(parseInt(id));
      if (dbPatch) {
        return dbPatch;
      }
    } catch (error) {
      console.warn('Failed to get patch from database, trying mock data:', error);
    }
    
    // Fallback to mock data
    const patch: Patch = this.patches.find(
      (patch) => patch.id === parseInt(id),
    );
    if (!patch) {
      throw new HttpException('Patch does not exist', HttpStatus.NOT_FOUND);
    }
    return patch;
  }

  public async getPatchTotal(): Promise<number> {
    try {
      // Try to get count from database first
      console.log('Environment variables:', {
        PATCHES_TABLE_NAME: process.env.PATCHES_TABLE_NAME,
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: process.env.AWS_REGION
      });
      console.log('Attempting to get patches from database...');
      const result = await this.patchRepository.list();
      console.log('Database result:', { count: result.count, itemsLength: result.items?.length });
      const dbPatches = result.items;
      if (dbPatches && dbPatches.length > 0) {
        console.log('Returning database count:', dbPatches.length);
        return dbPatches.length;
      }
      console.log('Database returned empty, falling back to mock data');
    } catch (error) {
      console.error('Failed to get patch count from database, using mock data:', error);
    }
    console.log('Using mock data count:', this.patches.length);
    return this.patches.length;
  }

  public async getLatestPatches(first: number, last: number): Promise<Patch[]> {
    return this.patches
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(first, last);
  }

  public async getPatchesByUser(
    username: string,
    first: number,
    last: number,
  ): Promise<Patch[]> {
    const userPatches: Patch[] = [];
    return this.userService.findOneByUsername(username).then((user) => {
      if (!user) {
        throw new HttpException(
          `User '${username}' not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      this.patches.forEach((patch) => {
        if (user.patches && user.patches.includes(patch.id)) {
          userPatches.push(patch);
        }
      });
      return userPatches.slice(first, last);
    });
  }

  public async getUserPatchTotal(username: string): Promise<number> {
    const userPatches: Patch[] = [];
    return this.userService.findOneByUsername(username).then((user) => {
      if (!user) {
        throw new HttpException(
          `User '${username}' not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      this.patches.forEach((patch) => {
        if (user.patches && user.patches.includes(patch.id)) {
          userPatches.push(patch);
        }
      });
      return userPatches.length;
    });
  }

  public async createPatch(username: string, patchData: Patch): Promise<Patch> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate required fields
    if (!patchData.title || patchData.title.trim() === '') {
      throw new HttpException(
        'Patch title is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Use the repository to create the patch in DynamoDB
      const newPatch = await this.patchRepository.createPatch({
        ...patchData,
        username: username, // Add username to patch data
      });

      console.log('Successfully created patch in database:', newPatch.id);
      return newPatch;
    } catch (error) {
      console.error('Failed to create patch in database:', error);
      
      // Fallback to in-memory creation for backward compatibility
      const newId = Math.max(...this.patches.map((p) => p.id), 0) + 1;
      const now = new Date().toISOString();

      const newPatch: Patch = {
        ...patchData,
        id: newId,
        created_at: now,
        updated_at: now,
        average_rating: '0',
        username: username,
      };

      this.patches.push(newPatch);

      // Add patch ID to user's patches
      if (!user.patches) {
        user.patches = [];
      }
      user.patches.push(newId);

      console.log('Created patch in memory as fallback:', newId);
      return newPatch;
    }
  }

  public async updatePatch(
    username: string,
    id: string,
    patchData: Patch,
  ): Promise<Patch> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const patchId = parseInt(id);
    const patchIndex = this.patches.findIndex((p) => p.id === patchId);

    if (patchIndex === -1) {
      throw new HttpException('Patch not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns this patch
    if (!user.patches || !user.patches.includes(patchId)) {
      throw new HttpException(
        'Unauthorized to modify this patch',
        HttpStatus.FORBIDDEN,
      );
    }

    // Validate required fields
    if (!patchData.title || patchData.title.trim() === '') {
      throw new HttpException(
        'Patch title is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedPatch: Patch = {
      ...this.patches[patchIndex],
      ...patchData,
      id: patchId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    this.patches[patchIndex] = updatedPatch;
    return updatedPatch;
  }

  // ====== NEW VERSIONING FEATURES ======

  /**
   * Update patch and create new version
   */
  public async updatePatchWithVersioning(
    username: string,
    id: string,
    patchData: Patch,
    changes?: string,
  ): Promise<{ patch: Patch; version: PatchVersion }> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const patchId = parseInt(id);
    const patch = await this.getPatch(id);

    // Check ownership
    if (!user.patches || !user.patches.includes(patchId)) {
      throw new HttpException(
        'Unauthorized to modify this patch',
        HttpStatus.FORBIDDEN,
      );
    }

    // Get next version number
    const latestVersion = await this.versionRepository.getLatestVersionNumber(
      patchId,
    );
    const newVersionNumber = latestVersion + 1;

    // Create version entry for the current state before updating
    const versionData: Omit<PatchVersion, 'id'> = {
      patchId,
      version: newVersionNumber,
      title: patchData.title,
      description: patchData.description,
      changes: changes || 'Updated patch parameters',
      patchData: {
        ...patchData,
        created_at: patch.created_at,
        updated_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      created_by: username,
    };

    // Update the main patch
    const updatedPatch = await this.updatePatch(username, id, {
      ...patchData,
      version: newVersionNumber,
      isLatest: true,
    });

    // Create version record
    const version = await this.versionRepository.createVersion(versionData);

    return { patch: updatedPatch, version };
  }

  /**
   * Get patch history
   */
  public async getPatchHistory(id: string): Promise<PatchHistory> {
    const patchId = parseInt(id);
    return this.versionRepository.getPatchHistory(patchId);
  }

  /**
   * Get specific patch version
   */
  public async getPatchVersion(
    id: string,
    version: number,
  ): Promise<PatchVersion | null> {
    const patchId = parseInt(id);
    return this.versionRepository.getPatchVersion(patchId, version);
  }

  /**
   * Compare two patch versions
   */
  public async comparePatches(
    patch1Id: string,
    patch2Id: string,
  ): Promise<PatchComparison> {
    const [patch1, patch2] = await Promise.all([
      this.getPatch(patch1Id),
      this.getPatch(patch2Id),
    ]);

    const differences = this.calculatePatchDifferences(patch1, patch2);
    const similarity = this.calculateSimilarity(patch1, patch2);

    return {
      patch1,
      patch2,
      differences,
      similarity,
    };
  }

  /**
   * Compare patch versions
   */
  public async comparePatchVersions(
    patchId: string,
    version1: number,
    version2: number,
  ): Promise<any> {
    const patchIdNum = parseInt(patchId);
    return this.versionRepository.compareVersions(
      patchIdNum,
      version1,
      version2,
    );
  }

  // ====== COLLECTION FEATURES ======

  /**
   * Create patch collection
   */
  public async createCollection(
    username: string,
    collectionData: Omit<
      PatchCollection,
      'id' | 'userId' | 'created_at' | 'updated_at'
    >,
  ): Promise<PatchCollection> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.collectionRepository.createCollection({
      ...collectionData,
      userId: user.id,
    });
  }

  /**
   * Get user collections
   */
  public async getUserCollections(
    username: string,
  ): Promise<PatchCollection[]> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const result = await this.collectionRepository.getUserCollections(user.id, {
      includePrivate: true,
    });

    return result.items;
  }

  /**
   * Get public collections
   */
  public async getPublicCollections(): Promise<PatchCollection[]> {
    const result = await this.collectionRepository.getPublicCollections();
    return result.items;
  }

  /**
   * Add patch to collection
   */
  public async addPatchToCollection(
    username: string,
    collectionId: number,
    patchId: number,
  ): Promise<PatchCollection> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(
        `User '${username}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const collection = await this.collectionRepository.findById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.NOT_FOUND);
    }

    if (collection.userId !== user.id) {
      throw new HttpException(
        'Unauthorized to modify this collection',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.collectionRepository.addPatchToCollection(
      collectionId,
      patchId,
    );
    if (!result) {
      throw new HttpException(
        'Failed to add patch to collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }

  // ====== ADVANCED SEARCH FEATURES ======

  /**
   * Advanced patch search with filters
   */
  public async searchPatches(
    searchTerm?: string,
    filters?: PatchSearchFilters,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'updated_at' | 'rating' | 'title';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ patches: Patch[]; total: number }> {
    try {
      // For now, implement basic search on in-memory patches
      // In production, this would use proper database queries
      let filteredPatches = [...this.patches];

      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredPatches = filteredPatches.filter(
          (patch) =>
            patch.title.toLowerCase().includes(term) ||
            patch.description.toLowerCase().includes(term) ||
            (patch.tags &&
              patch.tags.some((tag) => tag.toLowerCase().includes(term))),
        );
      }

      // Apply filters
      if (filters) {
        if (filters.category) {
          filteredPatches = filteredPatches.filter(
            (patch) => (patch as any).category === filters.category,
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filteredPatches = filteredPatches.filter(
            (patch) =>
              patch.tags &&
              filters.tags!.some((tag) => patch.tags!.includes(tag)),
          );
        }

        if (filters.minRating !== undefined) {
          filteredPatches = filteredPatches.filter(
            (patch) => parseFloat(patch.average_rating) >= filters.minRating!,
          );
        }

        if (filters.maxRating !== undefined) {
          filteredPatches = filteredPatches.filter(
            (patch) => parseFloat(patch.average_rating) <= filters.maxRating!,
          );
        }

        if (filters.username) {
          // This would need to be implemented with user-patch relationships
        }

        if (filters.dateFrom) {
          filteredPatches = filteredPatches.filter(
            (patch) =>
              new Date(patch.created_at) >= new Date(filters.dateFrom!),
          );
        }

        if (filters.dateTo) {
          filteredPatches = filteredPatches.filter(
            (patch) => new Date(patch.created_at) <= new Date(filters.dateTo!),
          );
        }

        // Synthesis parameter filters
        if (filters.synthesisParams) {
          filteredPatches = filteredPatches.filter((patch) => {
            return Object.entries(filters.synthesisParams!).every(
              ([param, range]) => {
                const value = (patch as any)[param];
                if (typeof value !== 'number') return true;

                const min = range.min !== undefined ? range.min : -Infinity;
                const max = range.max !== undefined ? range.max : Infinity;

                return value >= min && value <= max;
              },
            );
          });
        }
      }

      // Apply sorting
      if (options?.sortBy) {
        filteredPatches.sort((a, b) => {
          const field = options.sortBy!;
          let aVal = (a as any)[field];
          let bVal = (b as any)[field];

          if (field === 'rating') {
            aVal = parseFloat(a.average_rating);
            bVal = parseFloat(b.average_rating);
          }

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return options.sortOrder === 'desc'
              ? bVal.localeCompare(aVal)
              : aVal.localeCompare(bVal);
          }

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          }

          return 0;
        });
      }

      // Apply pagination
      const total = filteredPatches.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const patches = filteredPatches.slice(offset, offset + limit);

      return { patches, total };
    } catch (error) {
      throw new HttpException(
        'Search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get patch categories
   */
  public async getPatchCategories(): Promise<PatchCategory[]> {
    // Default categories for synthesizer patches
    return [
      {
        id: 'bass',
        name: 'Bass',
        description: 'Low frequency patches',
        color: '#ff6b6b',
      },
      {
        id: 'lead',
        name: 'Lead',
        description: 'Melodic lead sounds',
        color: '#4ecdc4',
      },
      {
        id: 'pad',
        name: 'Pad',
        description: 'Atmospheric pad sounds',
        color: '#45b7d1',
      },
      {
        id: 'arp',
        name: 'Arpeggio',
        description: 'Arpeggiated sequences',
        color: '#96ceb4',
      },
      {
        id: 'pluck',
        name: 'Pluck',
        description: 'Plucked string sounds',
        color: '#feca57',
      },
      {
        id: 'percussion',
        name: 'Percussion',
        description: 'Percussive sounds',
        color: '#ff9ff3',
      },
      {
        id: 'sfx',
        name: 'SFX',
        description: 'Sound effects',
        color: '#54a0ff',
      },
      {
        id: 'experimental',
        name: 'Experimental',
        description: 'Experimental sounds',
        color: '#5f27cd',
      },
    ];
  }

  /**
   * Get trending patches (most viewed/rated recently)
   */
  public async getTrendingPatches(limit = 10): Promise<Patch[]> {
    // For now, return highest rated patches
    // In production, this would consider views, ratings, and time
    return this.patches
      .sort(
        (a, b) => parseFloat(b.average_rating) - parseFloat(a.average_rating),
      )
      .slice(0, limit);
  }

  /**
   * Get featured patches
   */
  public async getFeaturedPatches(limit = 5): Promise<Patch[]> {
    // For now, return patches with ratings > 4.0
    return this.patches
      .filter((patch) => parseFloat(patch.average_rating) >= 4.0)
      .sort(
        (a, b) => parseFloat(b.average_rating) - parseFloat(a.average_rating),
      )
      .slice(0, limit);
  }

  /**
   * Get related patches based on similarity
   */
  public async getRelatedPatches(patchId: string, limit = 5): Promise<Patch[]> {
    const targetPatch = await this.getPatch(patchId);

    // Calculate similarity based on synthesis parameters
    const similarities = this.patches
      .filter((p) => p.id !== targetPatch.id)
      .map((patch) => ({
        patch,
        similarity: this.calculateSimilarity(targetPatch, patch),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map((s) => s.patch);
  }

  // ====== UTILITY METHODS ======

  /**
   * Calculate differences between two patches
   */
  private calculatePatchDifferences(
    patch1: Patch,
    patch2: Patch,
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

    // Define synthesis parameters to compare
    const synthParams = [
      'sub_fifth',
      'overtone',
      'ultra_saw',
      'saw',
      'pulse_width',
      'square',
      'metalizer',
      'triangle',
      'cutoff',
      'mode',
      'resonance',
      'env_amt',
      'brute_factor',
      'kbd_tracking',
      'octave',
      'volume',
      'glide',
      'mod_wheel',
      'amount',
      'wave',
      'rate',
      'sync',
      'env_amt_2',
      'vca',
      'attack',
      'decay',
      'sustain',
      'release',
      'pattern',
      'play',
      'rate_2',
    ];

    for (const param of synthParams) {
      const value1 = (patch1 as any)[param];
      const value2 = (patch2 as any)[param];

      if (value1 !== value2) {
        differences.push({
          field: param,
          value1,
          value2,
          type: 'modified',
        });
      }
    }

    return differences;
  }

  /**
   * Calculate similarity between two patches (0-1)
   */
  private calculateSimilarity(patch1: Patch, patch2: Patch): number {
    const synthParams = [
      'sub_fifth',
      'overtone',
      'ultra_saw',
      'saw',
      'pulse_width',
      'square',
      'metalizer',
      'triangle',
      'cutoff',
      'mode',
      'resonance',
      'env_amt',
      'brute_factor',
      'kbd_tracking',
      'octave',
      'volume',
      'glide',
      'mod_wheel',
      'amount',
      'wave',
      'rate',
      'sync',
      'env_amt_2',
      'vca',
      'attack',
      'decay',
      'sustain',
      'release',
      'pattern',
      'play',
      'rate_2',
    ];

    let totalDifference = 0;
    let paramCount = 0;

    for (const param of synthParams) {
      const value1 = (patch1 as any)[param];
      const value2 = (patch2 as any)[param];

      if (typeof value1 === 'number' && typeof value2 === 'number') {
        // Normalize the difference (assuming most params are 0-1)
        const maxVal = Math.max(
          1,
          Math.max(Math.abs(value1), Math.abs(value2)),
        );
        const difference = Math.abs(value1 - value2) / maxVal;
        totalDifference += difference;
        paramCount++;
      }
    }

    if (paramCount === 0) return 0;

    const averageDifference = totalDifference / paramCount;
    return Math.max(0, 1 - averageDifference); // Convert difference to similarity
  }
}

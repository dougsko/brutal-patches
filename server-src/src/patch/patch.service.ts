import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Patch } from '../interfaces/patch.interface';
import { User } from '../interfaces/user.interface';
import { PATCHES } from '../mock-patches';
import { UsersService } from '../users/users.service';

@Injectable()
export class PatchService {
  constructor(private userService: UsersService) {}

  patches: Patch[] = PATCHES;

  public async getAllPatches(): Promise<any> {
    return this.patches;
  }

  public async getPatch(id: string): Promise<Patch> {
    const patch: Patch = this.patches.find(
      (patch) => patch.id === parseInt(id),
    );
    if (!patch) {
      throw new HttpException('Patch does not exist', HttpStatus.NOT_FOUND);
    }
    return patch;
  }

  public async getPatchTotal(): Promise<number> {
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
        throw new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND);
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
        throw new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND);
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
      throw new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND);
    }

    // Validate required fields
    if (!patchData.title || patchData.title.trim() === '') {
      throw new HttpException('Patch title is required', HttpStatus.BAD_REQUEST);
    }

    // Generate new ID (in a real app, this would be done by database)
    const newId = Math.max(...this.patches.map(p => p.id), 0) + 1;
    const now = new Date().toISOString();
    
    const newPatch: Patch = {
      ...patchData,
      id: newId,
      created_at: now,
      updated_at: now,
      average_rating: '0'
    };

    this.patches.push(newPatch);
    
    // Add patch ID to user's patches
    if (!user.patches) {
      user.patches = [];
    }
    user.patches.push(newId);

    return newPatch;
  }

  public async updatePatch(username: string, id: string, patchData: Patch): Promise<Patch> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new HttpException(`User '${username}' not found`, HttpStatus.NOT_FOUND);
    }

    const patchId = parseInt(id);
    const patchIndex = this.patches.findIndex(p => p.id === patchId);
    
    if (patchIndex === -1) {
      throw new HttpException('Patch not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns this patch
    if (!user.patches || !user.patches.includes(patchId)) {
      throw new HttpException('Unauthorized to modify this patch', HttpStatus.FORBIDDEN);
    }

    // Validate required fields
    if (!patchData.title || patchData.title.trim() === '') {
      throw new HttpException('Patch title is required', HttpStatus.BAD_REQUEST);
    }

    const updatedPatch: Patch = {
      ...this.patches[patchIndex],
      ...patchData,
      id: patchId, // Ensure ID doesn't change
      updated_at: new Date().toISOString()
    };

    this.patches[patchIndex] = updatedPatch;
    return updatedPatch;
  }
}

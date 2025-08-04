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
    let myUser: User;
    return this.userService.findOneByUsername(username).then((user) => {
      myUser = user;
      this.patches.forEach((patch) => {
        if (myUser.patches.includes(patch.id)) {
          userPatches.push(patch);
        }
      });
      return userPatches.length;
    });
  }
}

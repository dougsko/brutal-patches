import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Patch } from 'src/interfaces/patch.interface';
import { User } from 'src/interfaces/user.interface';
import { UsersService } from 'src/users/users.service';
import { PATCHES } from '../mock-patches';

@Injectable()
export class PatchService {
    constructor(private userService: UsersService){}

    patches: Patch[] = PATCHES;

    public async getAllPatches(): Promise<any> {
        return this.patches;
    }

    public async getPatch(id: string): Promise<Patch> {
        const patch: Patch = this.patches.find(patch => patch.id === parseInt(id));
        if(!patch) {
            throw new HttpException("Patch does not exist", HttpStatus.NOT_FOUND)
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

    public async getPatchesByUser(userId: number, first: number, last: number,): Promise<Patch[]> {
        let userPatches: Patch[] = [];
        let myUser: User;
        return this.userService.findOneById(userId).then( user => {
            myUser = user;
            this.patches.forEach(patch => {
                if (myUser.patches.includes(patch.id)) {
                    userPatches.push(patch);
                }
            });
            return userPatches.slice(first, last);
        });
    }

    public async getUserPatchTotal(userId: number): Promise<number> {
        let userPatches: Patch[] = [];
        let myUser: User;
        return this.userService.findOneById(userId).then( user => {
            myUser = user;
            this.patches.forEach(patch => {
                if (myUser.patches.includes(patch.id)) {
                    userPatches.push(patch);
                }
            });
            return userPatches.length;
        });
    }
}


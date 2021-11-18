import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Patch } from '../interfaces/patch';
import { PATCHES } from '../mock-patches';

@Injectable()
export class PatchService {

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

    public async getLatestPatches(first: number, last: number): Promise<any> {
        return this.patches
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .slice(first, last);
    }
}


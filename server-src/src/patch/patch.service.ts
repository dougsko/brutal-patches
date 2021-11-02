import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Patch } from 'src/interfaces/patch';
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
}

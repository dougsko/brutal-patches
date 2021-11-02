import { Controller, Get, Param, Req } from '@nestjs/common';
import { Patch } from 'src/interfaces/patch';
import { PatchService } from './patch.service';

@Controller('api/patches')
export class PatchController {
    constructor(private readonly patchService: PatchService) { }

    @Get()
    async findAll(): Promise<Patch[]> {
        const patches = await this.patchService.getAllPatches();
        return patches;
    }

    @Get(":id")
    async findOne(@Param("id") id: string): Promise<Patch> {
        const patch = await this.patchService.getPatch(id);
        return patch;
    }

}

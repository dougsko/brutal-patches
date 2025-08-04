import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { Patch } from 'src/interfaces/patch.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatchService } from './patch.service';

@Controller('api/patches')
export class PatchController {
  constructor(private readonly patchService: PatchService) {}

  @Get()
  async findAll(): Promise<Patch[]> {
    const patches = await this.patchService.getAllPatches();
    return patches;
  }

  @Get('/total')
  async getTotal(): Promise<number> {
    return await this.patchService.getPatchTotal();
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:username/total')
  getMyTotal(
    @Request() req,
    @Param('username') username: string,
  ): Promise<number> {
    return this.patchService.getUserPatchTotal(username);
  }

  @Get('/:first/:last')
  async findLatestPatches(
    @Param('first') first: number,
    @Param('last') last: number,
  ): Promise<Patch[]> {
    const patches = await this.patchService.getLatestPatches(first, last);
    return patches;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:username/:first/:last')
  getMyPatches(
    @Request() req,
    @Param('username') username: string,
    @Param('first') first: number,
    @Param('last') last: number,
  ): Promise<Patch[]> {
    return this.patchService.getPatchesByUser(username, first, last);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Patch> {
    const patch = await this.patchService.getPatch(id);
    return patch;
  }
}

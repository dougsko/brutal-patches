import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
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
    // Users can only access their own patches through this endpoint
    if (req.user.username !== username) {
      throw new ForbiddenException('Access denied: You can only view your own patches');
    }
    return this.patchService.getPatchesByUser(username, first, last);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:username/total')
  getMyTotal(
    @Request() req,
    @Param('username') username: string,
  ): Promise<number> {
    // Users can only access their own patch totals
    if (req.user.username !== username) {
      throw new ForbiddenException('Access denied: You can only view your own patch statistics');
    }
    return this.patchService.getUserPatchTotal(username);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Patch> {
    const patch = await this.patchService.getPatch(id);
    return patch;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() patch: Patch): Promise<Patch> {
    return this.patchService.createPatch(req.user.username, patch);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() patch: Patch,
  ): Promise<Patch> {
    return this.patchService.updatePatch(req.user.username, id, patch);
  }
}

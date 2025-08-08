import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { 
  Patch, 
  PatchVersion, 
  PatchHistory, 
  PatchCollection,
  PatchSearchFilters,
  PatchComparison,
  PatchCategory
} from 'src/interfaces/patch.interface';
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
    // Users can only access their own patch totals
    if (req.user.username !== username) {
      throw new ForbiddenException('Access denied: You can only view your own patch statistics');
    }
    return this.patchService.getUserPatchTotal(username);
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

  @Get('/:first/:last')
  async findLatestPatches(
    @Param('first') first: number,
    @Param('last') last: number,
  ): Promise<Patch[]> {
    const patches = await this.patchService.getLatestPatches(first, last);
    return patches;
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

  // ====== NEW VERSIONING ENDPOINTS ======

  @UseGuards(JwtAuthGuard)
  @Put(':id/version')
  async updateWithVersioning(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { patch: Patch; changes?: string },
  ): Promise<{ patch: Patch; version: PatchVersion }> {
    return this.patchService.updatePatchWithVersioning(
      req.user.username, 
      id, 
      body.patch,
      body.changes
    );
  }

  @Get(':id/history')
  async getPatchHistory(@Param('id') id: string): Promise<PatchHistory> {
    return this.patchService.getPatchHistory(id);
  }

  @Get(':id/version/:version')
  async getPatchVersion(
    @Param('id') id: string,
    @Param('version') version: number,
  ): Promise<PatchVersion | null> {
    return this.patchService.getPatchVersion(id, version);
  }

  @Get(':id/compare/:otherId')
  async comparePatches(
    @Param('id') id: string,
    @Param('otherId') otherId: string,
  ): Promise<PatchComparison> {
    return this.patchService.comparePatches(id, otherId);
  }

  @Get(':id/versions/:version1/compare/:version2')
  async comparePatchVersions(
    @Param('id') id: string,
    @Param('version1') version1: number,
    @Param('version2') version2: number,
  ): Promise<any> {
    return this.patchService.comparePatchVersions(id, version1, version2);
  }

  @Get(':id/related')
  async getRelatedPatches(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<Patch[]> {
    return this.patchService.getRelatedPatches(id, limit || 5);
  }

  // ====== COLLECTION ENDPOINTS ======

  @UseGuards(JwtAuthGuard)
  @Post('collections')
  async createCollection(
    @Request() req,
    @Body() collectionData: Omit<PatchCollection, 'id' | 'userId' | 'created_at' | 'updated_at'>,
  ): Promise<PatchCollection> {
    return this.patchService.createCollection(req.user.username, collectionData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('collections/my')
  async getMyCollections(@Request() req): Promise<PatchCollection[]> {
    return this.patchService.getUserCollections(req.user.username);
  }

  @Get('collections/public')
  async getPublicCollections(): Promise<PatchCollection[]> {
    return this.patchService.getPublicCollections();
  }

  @UseGuards(JwtAuthGuard)
  @Put('collections/:collectionId/patches/:patchId')
  async addPatchToCollection(
    @Request() req,
    @Param('collectionId') collectionId: number,
    @Param('patchId') patchId: number,
  ): Promise<PatchCollection> {
    return this.patchService.addPatchToCollection(
      req.user.username, 
      collectionId, 
      patchId
    );
  }

  // ====== SEARCH AND DISCOVERY ENDPOINTS ======

  @Get('search')
  async searchPatches(
    @Query('q') searchTerm?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('minRating') minRating?: number,
    @Query('maxRating') maxRating?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('username') username?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sortBy') sortBy?: 'created_at' | 'updated_at' | 'rating' | 'title',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<{ patches: Patch[]; total: number }> {
    const filters: PatchSearchFilters = {};
    
    if (category) filters.category = category;
    if (tags) filters.tags = tags.split(',');
    if (minRating !== undefined) filters.minRating = minRating;
    if (maxRating !== undefined) filters.maxRating = maxRating;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (username) filters.username = username;

    const options = {
      limit,
      offset,
      sortBy,
      sortOrder,
    };

    return this.patchService.searchPatches(searchTerm, filters, options);
  }

  @Get('categories')
  async getPatchCategories(): Promise<PatchCategory[]> {
    return this.patchService.getPatchCategories();
  }

  @Get('trending')
  async getTrendingPatches(@Query('limit') limit?: number): Promise<Patch[]> {
    return this.patchService.getTrendingPatches(limit || 10);
  }

  @Get('featured')
  async getFeaturedPatches(@Query('limit') limit?: number): Promise<Patch[]> {
    return this.patchService.getFeaturedPatches(limit || 5);
  }
}

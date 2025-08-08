import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiProperty,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  Patch,
  PatchVersion,
  PatchHistory,
  PatchCollection,
  PatchSearchFilters,
  PatchComparison,
  PatchCategory,
} from 'src/interfaces/patch.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatchService } from './patch.service';

// Response DTOs for documentation
class PatchSearchResponse {
  @ApiProperty({
    description: 'Array of patches',
    type: 'array',
    items: { type: 'object' },
  })
  patches: Patch[];

  @ApiProperty({ description: 'Total count of matching patches' })
  total: number;
}

class PatchVersionResponse {
  @ApiProperty({ description: 'Updated patch', type: 'object' })
  patch: Patch;

  @ApiProperty({ description: 'Version information', type: 'object' })
  version: PatchVersion;
}

class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;
}

@ApiTags('Patches')
@Controller('api/patches')
export class PatchController {
  constructor(private readonly patchService: PatchService) {}

  @ApiOperation({
    summary: 'Get all patches',
    description: 'Retrieve all patches from the database',
  })
  @ApiResponse({
    status: 200,
    description: 'List of patches retrieved successfully',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @Get()
  async findAll(): Promise<Patch[]> {
    const patches = await this.patchService.getAllPatches();
    return patches;
  }

  @ApiOperation({
    summary: 'Get total patch count',
    description: 'Get the total number of patches in the database',
  })
  @ApiResponse({
    status: 200,
    description: 'Total patch count',
    schema: { type: 'number' },
  })
  @Get('/total')
  async getTotal(): Promise<number> {
    return await this.patchService.getPatchTotal();
  }

  @ApiOperation({
    summary: 'Get user patch count',
    description:
      'Get the total number of patches for a specific user (authenticated users only)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'username',
    description: 'Username to get patch count for',
  })
  @ApiResponse({
    status: 200,
    description: 'User patch count',
    schema: { type: 'number' },
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Access denied - users can only view their own statistics',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Get('/:username/total')
  getMyTotal(
    @Request() req,
    @Param('username') username: string,
  ): Promise<number> {
    // Users can only access their own patch totals
    if (req.user.username !== username) {
      throw new ForbiddenException(
        'Access denied: You can only view your own patch statistics',
      );
    }
    return this.patchService.getUserPatchTotal(username);
  }

  @ApiOperation({
    summary: 'Get user patches with pagination',
    description:
      'Get patches for a specific user with pagination (authenticated users only)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'username', description: 'Username to get patches for' })
  @ApiParam({ name: 'first', description: 'First item index for pagination' })
  @ApiParam({ name: 'last', description: 'Last item index for pagination' })
  @ApiResponse({
    status: 200,
    description: 'User patches retrieved successfully',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Access denied - users can only view their own patches',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
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
      throw new ForbiddenException(
        'Access denied: You can only view your own patches',
      );
    }
    return this.patchService.getPatchesByUser(username, first, last);
  }

  @ApiOperation({
    summary: 'Get latest patches with pagination',
    description: 'Get the most recent patches with pagination',
  })
  @ApiParam({ name: 'first', description: 'First item index for pagination' })
  @ApiParam({ name: 'last', description: 'Last item index for pagination' })
  @ApiResponse({
    status: 200,
    description: 'Latest patches retrieved successfully',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @Get('/:first/:last')
  async findLatestPatches(
    @Param('first') first: number,
    @Param('last') last: number,
  ): Promise<Patch[]> {
    const patches = await this.patchService.getLatestPatches(first, last);
    return patches;
  }

  @ApiOperation({
    summary: 'Get patch by ID',
    description: 'Retrieve a specific patch by its ID',
  })
  @ApiParam({ name: 'id', description: 'Patch ID' })
  @ApiResponse({
    status: 200,
    description: 'Patch retrieved successfully',
    schema: { type: 'object' },
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Patch not found',
    type: ErrorResponse,
  })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Patch> {
    const patch = await this.patchService.getPatch(id);
    return patch;
  }

  @ApiOperation({
    summary: 'Create new patch',
    description: 'Create a new synthesizer patch',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ description: 'Patch data to create', schema: { type: 'object' } })
  @ApiResponse({
    status: 201,
    description: 'Patch created successfully',
    schema: { type: 'object' },
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid patch data',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() patch: Patch): Promise<Patch> {
    return this.patchService.createPatch(req.user.username, patch);
  }

  @ApiOperation({
    summary: 'Update patch',
    description: 'Update an existing patch (owner only)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Patch ID to update' })
  @ApiBody({ description: 'Updated patch data', schema: { type: 'object' } })
  @ApiResponse({
    status: 200,
    description: 'Patch updated successfully',
    schema: { type: 'object' },
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid patch data',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Access denied - only patch owner can update',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    status: 404,
    description: 'Patch not found',
    type: ErrorResponse,
  })
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
      body.changes,
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
    @Body()
    collectionData: Omit<
      PatchCollection,
      'id' | 'userId' | 'created_at' | 'updated_at'
    >,
  ): Promise<PatchCollection> {
    return this.patchService.createCollection(
      req.user.username,
      collectionData,
    );
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
      patchId,
    );
  }

  // ====== SEARCH AND DISCOVERY ENDPOINTS ======

  @ApiOperation({
    summary: 'Search patches',
    description: 'Search for patches with various filters and sorting options',
  })
  @ApiQuery({ name: 'q', description: 'Search term', required: false })
  @ApiQuery({
    name: 'category',
    description: 'Filter by category',
    required: false,
  })
  @ApiQuery({
    name: 'tags',
    description: 'Filter by tags (comma-separated)',
    required: false,
  })
  @ApiQuery({
    name: 'minRating',
    description: 'Minimum rating filter',
    required: false,
  })
  @ApiQuery({
    name: 'maxRating',
    description: 'Maximum rating filter',
    required: false,
  })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Date range start',
    required: false,
  })
  @ApiQuery({ name: 'dateTo', description: 'Date range end', required: false })
  @ApiQuery({
    name: 'username',
    description: 'Filter by username',
    required: false,
  })
  @ApiQuery({ name: 'limit', description: 'Results limit', required: false })
  @ApiQuery({ name: 'offset', description: 'Results offset', required: false })
  @ApiQuery({
    name: 'sortBy',
    description: 'Sort by field',
    required: false,
    enum: ['created_at', 'updated_at', 'rating', 'title'],
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: PatchSearchResponse,
  })
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

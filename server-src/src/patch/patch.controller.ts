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
  async findAll(@Request() req?): Promise<Patch[]> {
    const requestingUser = req?.user?.username;
    const patches = await this.patchService.getAllPatches(requestingUser);
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
  @Get('total')
  async getTotal(@Request() req?): Promise<number> {
    const requestingUser = req?.user?.username;
    return await this.patchService.getPatchTotal(requestingUser);
  }

  @ApiOperation({
    summary: 'Get user public patch count',
    description: 'Get the total number of public patches for a specific user',
  })
  @ApiParam({
    name: 'username',
    description: 'Username to get public patch count for',
  })
  @ApiResponse({
    status: 200,
    description: 'User public patch count',
    schema: { type: 'number' },
  })
  @Get('users/:username/total')
  getUserTotal(@Request() req, @Param('username') username: string): Promise<number> {
    const requestingUser = req?.user?.username;
    return this.patchService.getUserPatchTotal(username, requestingUser);
  }

  @ApiOperation({
    summary: 'Get user public patches with pagination',
    description: 'Get public patches for a specific user with pagination',
  })
  @ApiParam({ name: 'username', description: 'Username to get public patches for' })
  @ApiQuery({ name: 'offset', description: 'First item index for pagination', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of items to return', required: false })
  @ApiResponse({
    status: 200,
    description: 'User public patches retrieved successfully',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @Get('users/:username')
  getUserPatches(
    @Param('username') username: string,
    @Query('offset') offsetParam?: string,
    @Query('limit') limitParam?: string,
  ): Promise<Patch[]> {
    const offset = parseInt(offsetParam || '0', 10);
    const limit = parseInt(limitParam || '100', 10);
    return this.patchService.getPatchesByUser(username, offset, limit);
  }

  @ApiOperation({
    summary: 'Get my patches with pagination',
    description: 'Get all patches (including private) for the authenticated user',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'offset', description: 'First item index for pagination', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of items to return', required: false })
  @ApiResponse({
    status: 200,
    description: 'My patches retrieved successfully',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Get('user/patches')
  getMyPatches(
    @Request() req,
    @Query('offset') offsetParam?: string,
    @Query('limit') limitParam?: string,
  ): Promise<Patch[]> {
    const offset = parseInt(offsetParam || '0', 10);
    const limit = parseInt(limitParam || '100', 10);
    return this.patchService.getPatchesByUser(req.user.username, offset, limit, req.user.username);
  }

  @ApiOperation({
    summary: 'Get my total patch count',
    description: 'Get total patch count (including private) for the authenticated user',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'My total patch count',
    schema: { type: 'number' },
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Get('my/total')
  getMyTotal(@Request() req): Promise<number> {
    return this.patchService.getUserPatchTotal(req.user.username, req.user.username);
  }

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
    @Request() req,
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

    const requestingUser = req?.user?.username;
    return this.patchService.searchPatches(searchTerm, filters, options, requestingUser);
  }

  @Get('categories')
  async getPatchCategories(): Promise<PatchCategory[]> {
    return this.patchService.getPatchCategories();
  }

  @Get('trending')
  async getTrendingPatches(@Request() req, @Query('limit') limit?: number): Promise<Patch[]> {
    const requestingUser = req?.user?.username;
    return this.patchService.getTrendingPatches(limit || 10, requestingUser);
  }

  @Get('featured')
  async getFeaturedPatches(@Request() req, @Query('limit') limit?: number): Promise<Patch[]> {
    const requestingUser = req?.user?.username;
    return this.patchService.getFeaturedPatches(limit || 5, requestingUser);
  }

  @ApiOperation({
    summary: 'Get latest patches with pagination',
    description: 'Get the most recent patches with cursor or offset pagination',
  })
  @ApiQuery({ name: 'offset', description: 'First item index for pagination (legacy)', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of items to return', required: false })
  @ApiQuery({ name: 'cursor', description: 'Cursor for pagination', required: false })
  @ApiResponse({
    status: 200,
    description: 'Latest patches retrieved successfully',
    schema: { 
      oneOf: [
        { type: 'array', items: { type: 'object' } },
        { 
          type: 'object',
          properties: {
            patches: { type: 'array', items: { type: 'object' } },
            nextCursor: { type: 'string' },
            hasMore: { type: 'boolean' }
          }
        }
      ]
    },
  })
  @Get('latest')
  async findLatestPatches(
    @Request() req,
    @Query('offset') offsetParam?: string,
    @Query('limit') limitParam?: string,
    @Query('cursor') cursor?: string,
  ): Promise<Patch[] | {patches: Patch[], nextCursor?: string, hasMore: boolean}> {
    const limit = parseInt(limitParam || '25', 10);
    const requestingUser = req?.user?.username;
    
    if (cursor !== undefined || offsetParam === undefined) {
      // Use cursor-based pagination
      console.log('🔥 Latest patches (cursor) route hit!', { limit, cursor });
      return await this.patchService.getLatestPatchesCursor(limit, requestingUser, cursor);
    } else {
      // Legacy offset-based pagination
      console.log('🔥 Latest patches (legacy) route hit!', { offsetParam, limitParam });
      const offset = parseInt(offsetParam || '0', 10);
      const patches = await this.patchService.getLatestPatches(offset, limit, requestingUser);
      return patches;
    }
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
  async findOne(@Request() req, @Param('id') id: string): Promise<Patch> {
    console.log('🔥 Single patch route hit with ID:', id);
    const requestingUser = req?.user?.username;
    const patch = await this.patchService.getPatch(id, requestingUser);
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
  async getPatchHistory(@Request() req, @Param('id') id: string): Promise<PatchHistory> {
    const requestingUser = req?.user?.username;
    return this.patchService.getPatchHistory(id, requestingUser);
  }

  @Get(':id/version/:version')
  async getPatchVersion(
    @Request() req,
    @Param('id') id: string,
    @Param('version') version: number,
  ): Promise<PatchVersion | null> {
    const requestingUser = req?.user?.username;
    return this.patchService.getPatchVersion(id, version, requestingUser);
  }

  @Get(':id/compare/:otherId')
  async comparePatches(
    @Request() req,
    @Param('id') id: string,
    @Param('otherId') otherId: string,
  ): Promise<PatchComparison> {
    const requestingUser = req?.user?.username;
    return this.patchService.comparePatches(id, otherId, requestingUser);
  }

  @Get(':id/versions/:version1/compare/:version2')
  async comparePatchVersions(
    @Request() req,
    @Param('id') id: string,
    @Param('version1') version1: number,
    @Param('version2') version2: number,
  ): Promise<any> {
    const requestingUser = req?.user?.username;
    return this.patchService.comparePatchVersions(id, version1, version2, requestingUser);
  }

  @Get(':id/related')
  async getRelatedPatches(
    @Request() req,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<Patch[]> {
    const requestingUser = req?.user?.username;
    return this.patchService.getRelatedPatches(id, limit || 5, requestingUser);
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
  // (Moved above to prevent conflicts with :id route)
}

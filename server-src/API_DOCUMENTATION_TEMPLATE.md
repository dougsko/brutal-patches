# Brutal Patches API Documentation Template

This template provides a guide for adding comprehensive Swagger/OpenAPI documentation to all API endpoints.

## API Documentation Standards

### 1. Controller-Level Documentation

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Controller Name')
@Controller('api/endpoint')
export class ExampleController {
  // Controller implementation
}
```

### 2. Endpoint Documentation

```typescript
@ApiOperation({ 
  summary: 'Brief description of the endpoint',
  description: 'Detailed description of what the endpoint does and how to use it'
})
@ApiBearerAuth('JWT-auth') // For protected endpoints
@ApiResponse({ 
  status: 200, 
  description: 'Success response description', 
  type: ResponseDto 
})
@ApiBadRequestResponse({ 
  status: 400, 
  description: 'Bad request description', 
  type: ErrorResponse 
})
@ApiUnauthorizedResponse({ 
  status: 401, 
  description: 'Unauthorized access description', 
  type: ErrorResponse 
})
@Post('/example')
async exampleEndpoint(@Body() dto: RequestDto) {
  // Implementation
}
```

### 3. DTO Documentation

```typescript
export class ExampleDto {
  @ApiProperty({
    description: 'Property description',
    example: 'example value',
    required: true,
    type: String,
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  property: string;
}
```

## Controllers That Need Documentation

### ✅ Completed
- [x] AuthController - Basic authentication endpoints
- [x] HealthController - Health check endpoints

### ⏳ In Progress
- [ ] PatchController - Patch management endpoints
- [ ] UsersController - User management endpoints
- [ ] AdminController - Administrative endpoints

### 📋 Pending
- [ ] Collections endpoints (if exposed separately)
- [ ] Versions endpoints (if exposed separately)

## Standard Response DTOs

### Success Responses
```typescript
class PaginatedResponse<T> {
  @ApiProperty({ description: 'Items array' })
  items: T[];
  
  @ApiProperty({ description: 'Total count of items' })
  totalCount: number;
  
  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Error Responses
```typescript
class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;

  @ApiProperty({ description: 'Validation errors', required: false })
  validationErrors?: string[];
}
```

## Implementation Checklist

### For Each Controller:
- [ ] Add `@ApiTags()` decorator
- [ ] Import necessary Swagger decorators
- [ ] Create response DTOs for documentation
- [ ] Add operation documentation to each endpoint:
  - [ ] `@ApiOperation()` with summary and description
  - [ ] `@ApiResponse()` for success cases
  - [ ] Error response decorators (`@ApiBadRequestResponse()`, etc.)
  - [ ] `@ApiBearerAuth()` for protected endpoints
  - [ ] `@ApiBody()` for POST/PUT endpoints

### For Each DTO:
- [ ] Add `@ApiProperty()` decorators to all properties
- [ ] Include examples, validation rules, and descriptions
- [ ] Use proper OpenAPI types and formats

## Testing the Documentation

1. Start the development server: `npm run start:dev`
2. Navigate to `http://localhost:4000/api-docs`
3. Verify all endpoints are properly documented
4. Test the "Try it out" functionality
5. Check that authentication works with JWT tokens

## Production Considerations

- Swagger is only enabled in non-production environments for security
- Documentation is available at `/api-docs` endpoint
- JWT authentication is properly configured
- All sensitive information is excluded from documentation

## Next Steps

1. Complete documentation for all remaining controllers
2. Add comprehensive examples for complex request/response structures
3. Include API versioning information
4. Add rate limiting documentation
5. Create interactive examples for synthesizer patch parameters